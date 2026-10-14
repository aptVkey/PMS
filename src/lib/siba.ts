import "server-only";
import { readIntegrationSecret } from "@/lib/integrations";

// SIBA (Sistema de Informação de Boletins de Alojamento) — comunicação
// obrigatória de hóspedes estrangeiros à UCFE/SEF, via Web Service SOAP.
//
// A inscrição da unidade de alojamento (NIF, atividade, morada, e a escolha
// do modo de envio "Web Service") só se faz no portal siba.ssi.gov.pt — não
// há nenhuma chamada de API para isso. Depois da inscrição ser validada, a
// UCFE envia por email um ofício com os três dados que autenticam esta
// integração: Unidade Hoteleira (NIF), Estabelecimento e Chave de Ativação.
// Se a inscrição não tiver escolhido "Web Service" como modo de envio, a
// chamada abaixo falha sempre, mesmo com credenciais corretas (ver
// formatSibaErrors) — a alteração de modo só se pede por email a
// siba@ssi.gov.pt, não é possível mudar sozinho.
//
// Fontes revistas (site público completo, 13-14/09/2026): Modos de Envio
// (https://siba.ssi.gov.pt/ajuda/modos-de-envio/ — formato .DAT e a
// operação SOAP), Manual de Utilizador PDF (formulários e exemplos reais de
// ficheiro), Perguntas Técnicas (confirma a lista de campos obrigatórios e
// o ambiente de testes bawsdev), Perguntas Frequentes (tipos de documento
// aceites, prazos legais), Legislação e Protocolos (só textos legais, nada
// técnico), e o WSDL de desenvolvimento em bruto (confirma que `Boletins` é
// só uma string opaca do lado do SOAP — o XSD do conteúdo em si nunca é
// publicado, só é dado a fornecedores de Front-Office ou por pedido a
// siba@ssi.gov.pt). O envelope SOAP abaixo foi testado contra o ambiente de
// desenvolvimento real com credenciais inválidas de propósito, e a SIBA
// respondeu com um erro estruturado genuíno — confirma que o formato do
// pedido está correto.
//
// Um NIF pode ter vários Estabelecimentos (um por alojamento) — por isso
// estas credenciais são geridas por alojamento, não globalmente, e o
// segredo no Vault leva o id do alojamento no nome.
export function sibaChaveAcessoSecretName(propertyId: string): string {
  return `siba_chave_acesso:${propertyId}`;
}

const SIBA_WSDL_NAMESPACE = "http://sef.pt/";
const SIBA_PROD_ENDPOINT =
  "https://siba.ssi.gov.pt/baws/boletinsalojamento.asmx";
// Útil para testar buildBoletimXml sem afetar dados reais antes de confiar
// nela — ver o aviso junto a essa função.
export const SIBA_DEV_ENDPOINT =
  "https://siba.ssi.gov.pt/bawsdev/boletinsalojamento.asmx";

export type SibaCredentials = {
  nif: string;
  estabelecimento: string;
  chaveAcesso: string;
};

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildSoapEnvelope(
  credentials: SibaCredentials,
  boletinsBase64: string,
): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <EntregaBoletinsAlojamento xmlns="${SIBA_WSDL_NAMESPACE}">
      <UnidadeHoteleira>${xmlEscape(credentials.nif)}</UnidadeHoteleira>
      <Estabelecimento>${xmlEscape(credentials.estabelecimento)}</Estabelecimento>
      <ChaveAcesso>${xmlEscape(credentials.chaveAcesso)}</ChaveAcesso>
      <Boletins>${boletinsBase64}</Boletins>
    </EntregaBoletinsAlojamento>
  </soap:Body>
</soap:Envelope>`;
}

async function callEntregaBoletinsAlojamento(
  endpoint: string,
  credentials: SibaCredentials,
  boletinsXml: string,
): Promise<{ raw: string } | { error: string }> {
  const boletinsBase64 = Buffer.from(boletinsXml, "utf-8").toString("base64");
  const envelope = buildSoapEnvelope(credentials, boletinsBase64);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: `${SIBA_WSDL_NAMESPACE}EntregaBoletinsAlojamento`,
      },
      body: envelope,
      signal: AbortSignal.timeout(20_000),
    });

    const text = await response.text();
    if (!response.ok) {
      return { error: `A SIBA respondeu com o estado ${response.status}.` };
    }
    return { raw: text };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro de rede desconhecido.",
    };
  }
}

export type SibaErrorDetail = {
  linha: string;
  codigo: string;
  descricao: string;
};

export type SibaParsedResult =
  | { success: true }
  | { success: false; errors: SibaErrorDetail[] }
  | { success: false; unknown: string };

// O corpo de erro vem como XML dentro do próprio texto do resultado, com as
// entidades escapadas (confirmado contra o endpoint de desenvolvimento da
// SIBA: <ErrosBA><RetornoBA><Linha/><Codigo_Retorno/><Descricao/></RetornoBA></ErrosBA>).
// "0" continua a ser o único código de sucesso documentado.
function parseSibaResult(raw: string): SibaParsedResult {
  const match = raw.match(
    /<EntregaBoletinsAlojamentoResult>([\s\S]*?)<\/EntregaBoletinsAlojamentoResult>/,
  );
  if (!match) return { success: false, unknown: raw };

  const content = match[1].trim();
  if (content === "0") return { success: true };

  const decoded = content
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");

  const errors: SibaErrorDetail[] = [];
  const retornoRegex = /<RetornoBA>([\s\S]*?)<\/RetornoBA>/g;
  for (const retornoMatch of decoded.matchAll(retornoRegex)) {
    const block = retornoMatch[1];
    errors.push({
      linha: block.match(/<Linha>([\s\S]*?)<\/Linha>/)?.[1]?.trim() ?? "",
      codigo:
        block
          .match(/<Codigo_Retorno>([\s\S]*?)<\/Codigo_Retorno>/)?.[1]
          ?.trim() ?? "",
      descricao:
        block.match(/<Descricao>([\s\S]*?)<\/Descricao>/)?.[1]?.trim() ?? "",
    });
  }

  if (errors.length > 0) return { success: false, errors };
  // Nem todas as respostas de erro vêm na estrutura <ErrosBA> — "Dados de
  // Entrada Inválidos" (credenciais erradas) e "O método de envio
  // selecionado no momento do registo não lhe permite efetuar esta
  // operação" (registo feito para Upload/Portal, não Web Service) são
  // devolvidas como texto simples, confirmado no FAQ técnico da SIBA.
  return { success: false, unknown: decoded };
}

function formatSibaErrors(
  result: SibaParsedResult & { success: false },
): string {
  if ("errors" in result) {
    return result.errors
      .map((e) => e.descricao || `Erro ${e.codigo}`)
      .join("; ");
  }

  if (result.unknown.includes("método de envio selecionado")) {
    return "A unidade foi inscrita na SIBA com outro modo de envio (Upload de Ficheiro ou Página no Portal), não Web Service. Pede a alteração do modo de envio em siba@ssi.gov.pt.";
  }

  return result.unknown || "A SIBA devolveu uma resposta inesperada.";
}

export type SibaVerification =
  { success: true } | { success: false; error: string; raw?: string };

// Não existe nenhuma operação de "testar ligação" nesta API — só a de
// entrega. Valida as credenciais enviando uma lista de boletins vazia: se a
// SIBA aceitar (código "0"), as credenciais estão corretas e nada foi
// comunicado (não há hóspedes na lista). Qualquer outra resposta é mostrada
// tal e qual ao utilizador, em vez de adivinhar o que significa.
export async function verifySibaCredentials(
  credentials: SibaCredentials,
): Promise<SibaVerification> {
  const emptyBoletins = "<Boletins></Boletins>";
  const result = await callEntregaBoletinsAlojamento(
    SIBA_PROD_ENDPOINT,
    credentials,
    emptyBoletins,
  );

  if ("error" in result) {
    return { success: false, error: result.error };
  }

  const parsed = parseSibaResult(result.raw);
  if (parsed.success) {
    return { success: true };
  }

  return {
    success: false,
    error: formatSibaErrors(parsed),
    raw: result.raw,
  };
}

export async function getSibaChaveAcesso(
  propertyId: string,
): Promise<string | null> {
  return readIntegrationSecret(sibaChaveAcessoSecretName(propertyId));
}

// Tipo de documento: a FAQ da SIBA (P17 das Perguntas Frequentes) aceita
// passaporte, bilhete de identidade/cartão de cidadão, laissez-passer,
// licença de voo, documentos de marítimo, título de residência e boletim de
// nascimento — mas só "P" (Passaporte) e "B" (Bilhete de Identidade/Cartão
// de Cidadão) têm o código de letra confirmado a partir de exemplos reais
// no manual. Por isso este campo fica como texto livre em vez de um union
// fechado — não inventes códigos para os outros tipos sem confirmar com a
// UCFE (siba@ssi.gov.pt).
export type SibaDocumentType = string;

export type SibaBoletimEntry = {
  apelido: string;
  nome: string;
  // Código de país ICAO de 3 letras (ex: "PRT", "ESP") — a SIBA só aceita
  // esta tabela (FAQ técnico P14: "Não serão aceites outras tabelas de
  // códigos de país"). Coincide com ISO 3166-1 alpha-3 na grande maioria dos
  // países, mas a lista oficial só está disponível dentro da área reservada
  // da SIBA depois de autenticado — confirma lá antes de confiar às cegas.
  nacionalidade: string;
  dataNascimento: string; // AAAAMMDD
  localNascimento?: string;
  numeroDocumento: string;
  tipoDocumento: SibaDocumentType;
  paisEmissorDocumento: string; // código de país ICAO de 3 letras
  paisResidencia: string; // código de país ICAO de 3 letras
  localResidencia?: string;
  dataEntrada: string; // AAAAMMDD — data de check-in
  dataSaida?: string; // AAAAMMDD — só no dia em que o check-out acontece
};

// ATENÇÃO — mapeamento de campos por inferência, não por confirmação direta
// do XSD oficial (BAL.XSD): reconstruído a partir do layout do ficheiro
// .DAT documentado no Manual de Utilizador da SIBA (que usa exatamente este
// conjunto de campos, pela mesma ordem que o formulário web de
// preenchimento manual) — não consegui obter o BAL.XSD em si (o WSDL de
// produção e o link direto do XSD não responderam). Os NOMES das tags XML
// abaixo são a melhor inferência possível a partir desses dois documentos,
// mas não estão confirmados campo a campo. Antes de usar isto para entregas
// reais, testa contra o endpoint de desenvolvimento (bawsdev) e confirma o
// código de resposta, ou pede o BAL.XSD à UCFE (siba@ssi.gov.pt).
function buildBoletimXml(entries: SibaBoletimEntry[]): string {
  const records = entries
    .map(
      (entry) => `  <Boletim_Alojamento>
    <Apelido>${xmlEscape(entry.apelido)}</Apelido>
    <Nome>${xmlEscape(entry.nome)}</Nome>
    <Nacionalidade>${xmlEscape(entry.nacionalidade)}</Nacionalidade>
    <DataNascimento>${xmlEscape(entry.dataNascimento)}</DataNascimento>
    <LocalNascimento>${xmlEscape(entry.localNascimento ?? "")}</LocalNascimento>
    <NumeroDocumento>${xmlEscape(entry.numeroDocumento)}</NumeroDocumento>
    <TipoDocumento>${entry.tipoDocumento}</TipoDocumento>
    <PaisEmissorDocumento>${xmlEscape(entry.paisEmissorDocumento)}</PaisEmissorDocumento>
    <PaisResidencia>${xmlEscape(entry.paisResidencia)}</PaisResidencia>
    <LocalResidencia>${xmlEscape(entry.localResidencia ?? "")}</LocalResidencia>
    <DataEntrada>${xmlEscape(entry.dataEntrada)}</DataEntrada>
    <DataSaida>${xmlEscape(entry.dataSaida ?? "")}</DataSaida>
  </Boletim_Alojamento>`,
    )
    .join("\n");

  return `<Boletins>\n${records}\n</Boletins>`;
}

export type SubmitSibaResult =
  | { success: true; code: string }
  | { success: false; error: string; raw?: string };

// Pronto a ser chamado quando se quiser comunicar hóspedes à SIBA
// automaticamente (ex: no check-in) — ver o aviso em buildBoletimXml antes
// de ligar isto a entregas reais.
export async function submitSibaBoletins(
  credentials: SibaCredentials,
  entries: SibaBoletimEntry[],
): Promise<SubmitSibaResult> {
  const xml = buildBoletimXml(entries);
  const result = await callEntregaBoletinsAlojamento(
    SIBA_PROD_ENDPOINT,
    credentials,
    xml,
  );

  if ("error" in result) {
    return { success: false, error: result.error };
  }

  const parsed = parseSibaResult(result.raw);
  if (parsed.success) {
    return { success: true, code: "0" };
  }

  return {
    success: false,
    error: formatSibaErrors(parsed),
    raw: result.raw,
  };
}
