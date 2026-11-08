import "server-only";
import { createClient } from "@/lib/supabase/server";
import { diffDaysISO } from "@/lib/date-utils";
import type { PermissionKey } from "@/lib/staff";

// Ferramentas SÓ DE LEITURA que o assistente pode chamar. Correm com a sessão
// de quem pergunta (RLS) e, além disso, cada uma exige as mesmas permissões
// que o ecrã equivalente do backoffice — o assistente nunca mostra mais do
// que a pessoa já veria na app.

type Args = Record<string, unknown>;
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type AssistantTool = {
  name: string;
  description: string;
  // Vazio = qualquer membro ativo da equipa.
  permissions: PermissionKey[];
  parameters: {
    type: "OBJECT";
    properties: Record<
      string,
      { type: string; description: string; enum?: string[] }
    >;
    required?: string[];
  };
  run: (supabase: SupabaseClient, args: Args) => Promise<unknown>;
};

const MAX_ROWS = 60;
const MAX_SPAN_DAYS = 366 * 3;

function dateArg(args: Args, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`O parâmetro "${key}" tem de ser uma data YYYY-MM-DD.`);
  }
  return value;
}

function range(args: Args): { from: string; to: string } {
  const from = dateArg(args, "from");
  const to = dateArg(args, "to");
  if (to < from) throw new Error('"to" não pode ser anterior a "from".');
  if (diffDaysISO(from, to) > MAX_SPAN_DAYS) {
    throw new Error("Intervalo demasiado grande (máximo 3 anos).");
  }
  return { from, to };
}

function textArg(args: Args, key: string): string | null {
  const value = args[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function includes(haystack: string | null | undefined, needle: string | null) {
  if (!needle) return true;
  return (haystack ?? "").toLowerCase().includes(needle.toLowerCase());
}

// O Supabase devolve no máximo 1000 linhas por pedido; isto vai buscando
// páginas até acabar.
async function fetchAll<T>(
  build: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < 20; page++) {
    const { data, error } = await build(page * 1000, page * 1000 + 999);
    if (error) throw new Error("Não foi possível ler os dados.");
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

type BookingRow = {
  booking_number: number;
  check_in: string;
  check_out: string;
  status: string;
  total_amount: number;
  channel: string | null;
  num_adults: number;
  num_children: number;
  num_infants: number;
  guest: { name: string; nationality: string | null } | null;
  room: { name: string; property: { name: string } | null } | null;
  payments: { amount: number }[] | null;
};

const BOOKING_SELECT =
  "booking_number, check_in, check_out, status, total_amount, channel, num_adults, num_children, num_infants, guest:guests(name, nationality), room:rooms(name, property:properties(name)), payments(amount)";

export const ASSISTANT_TOOLS: AssistantTool[] = [
  {
    name: "get_properties_info",
    description:
      "Informação sobre alojamentos e respetivas unidades: tipo, descrição, capacidade, quartos, casas de banho, área, preço base, estadia mínima e comodidades (amenities). Usa para perguntas como 'o alojamento X tem piscina/ar condicionado/estacionamento?'. Se a comodidade não estiver na lista nem na descrição, não consta do sistema.",
    permissions: [],
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description:
            "Parte do nome do alojamento ou da unidade. Omitir para listar todos.",
        },
      },
    },
    async run(supabase, args) {
      const query = textArg(args, "query");
      const { data: properties, error } = await supabase
        .from("properties")
        .select(
          "name, property_type, description, rooms(name, type, description, capacity_adults, capacity_children, bedrooms, bathrooms, size_m2, base_price, currency, min_stay_nights, amenities, is_published)",
        )
        .order("name");
      if (error) throw new Error("Não foi possível ler os alojamentos.");

      type Room = {
        name: string;
        type: string;
        description: string | null;
        capacity_adults: number;
        capacity_children: number;
        bedrooms: unknown[] | null;
        bathrooms: unknown[] | null;
        size_m2: number | null;
        base_price: number;
        currency: string;
        min_stay_nights: number | null;
        amenities: string[] | null;
        is_published: boolean;
      };

      return (properties ?? [])
        .filter(
          (p) =>
            !query ||
            includes(p.name as string, query) ||
            ((p.rooms as unknown as Room[]) ?? []).some((r) =>
              includes(r.name, query),
            ),
        )
        .slice(0, 25)
        .map((p) => ({
          alojamento: p.name,
          tipo: p.property_type,
          descricao: p.description,
          unidades: ((p.rooms as unknown as Room[]) ?? []).map((r) => ({
            nome: r.name,
            tipo: r.type,
            descricao: r.description,
            hospedes_max: r.capacity_adults + r.capacity_children,
            quartos: r.bedrooms?.length ?? 0,
            casas_de_banho: r.bathrooms?.length ?? 0,
            area_m2: r.size_m2,
            preco_base_noite: `${r.base_price} ${r.currency}`,
            estadia_minima_noites: r.min_stay_nights,
            comodidades: r.amenities ?? [],
            publicado_no_site: r.is_published,
          })),
        }));
    },
  },
  {
    name: "get_bookings",
    description:
      "Lista reservas num intervalo de datas, ordenadas por data. Serve para 'próximos check-ins', 'quem sai amanhã', 'reservas do alojamento X em Y'. date_field escolhe o que o intervalo filtra: check_in (entradas), check_out (saídas) ou stay (reservas que ocupam alguma noite do intervalo). Devolve no máximo 60 reservas.",
    permissions: ["reservas"],
    parameters: {
      type: "OBJECT",
      properties: {
        from: {
          type: "STRING",
          description: "Data inicial YYYY-MM-DD (inclusive).",
        },
        to: {
          type: "STRING",
          description: "Data final YYYY-MM-DD (inclusive).",
        },
        date_field: {
          type: "STRING",
          description: "check_in, check_out ou stay.",
          enum: ["check_in", "check_out", "stay"],
        },
        property: {
          type: "STRING",
          description: "Parte do nome do alojamento ou unidade (opcional).",
        },
        include_cancelled: {
          type: "BOOLEAN",
          description: "Incluir reservas canceladas. Por defeito não.",
        },
      },
      required: ["from", "to", "date_field"],
    },
    async run(supabase, args) {
      const { from, to } = range(args);
      const field = String(args.date_field);
      const property = textArg(args, "property");

      let rows = await fetchAll<BookingRow>((a, b) => {
        let q = supabase.from("bookings").select(BOOKING_SELECT);
        if (field === "check_in")
          q = q.gte("check_in", from).lte("check_in", to);
        else if (field === "check_out")
          q = q.gte("check_out", from).lte("check_out", to);
        else q = q.lte("check_in", to).gt("check_out", from);
        if (args.include_cancelled !== true) q = q.neq("status", "cancelada");
        return q
          .order(field === "check_out" ? "check_out" : "check_in")
          .range(a, b) as unknown as PromiseLike<{
          data: BookingRow[] | null;
          error: { message: string } | null;
        }>;
      });

      rows = rows.filter(
        (r) =>
          !property ||
          includes(r.room?.name, property) ||
          includes(r.room?.property?.name, property),
      );

      return {
        total_encontradas: rows.length,
        reservas: rows.slice(0, MAX_ROWS).map((r) => ({
          numero: r.booking_number,
          hospede: r.guest?.name ?? null,
          nacionalidade: r.guest?.nationality ?? null,
          alojamento: r.room?.property?.name ?? null,
          unidade: r.room?.name ?? null,
          check_in: r.check_in,
          check_out: r.check_out,
          noites: diffDaysISO(r.check_in, r.check_out),
          hospedes: r.num_adults + r.num_children + r.num_infants,
          estado: r.status,
          canal: r.channel,
          valor_total: r.total_amount,
        })),
        truncado: rows.length > MAX_ROWS,
      };
    },
  },
  {
    name: "get_revenue_summary",
    description:
      "Faturação (receita de reservas) num intervalo. Definição usada no backoffice: soma do valor total das reservas NÃO canceladas cujo check-in cai no intervalo (não é dinheiro recebido). Devolve também nº de reservas, noites e quanto já foi pago. Pode agrupar por alojamento, canal ou mês.",
    permissions: ["reservas", "relatorios"],
    parameters: {
      type: "OBJECT",
      properties: {
        from: {
          type: "STRING",
          description: "Data inicial YYYY-MM-DD (inclusive).",
        },
        to: {
          type: "STRING",
          description: "Data final YYYY-MM-DD (inclusive).",
        },
        group_by: {
          type: "STRING",
          description: "none, property, channel ou month.",
          enum: ["none", "property", "channel", "month"],
        },
        property: {
          type: "STRING",
          description:
            "Filtrar por parte do nome do alojamento/unidade (opcional).",
        },
      },
      required: ["from", "to"],
    },
    async run(supabase, args) {
      const { from, to } = range(args);
      const property = textArg(args, "property");
      const groupBy = String(args.group_by ?? "none");

      const rows = (
        await fetchAll<BookingRow>(
          (a, b) =>
            supabase
              .from("bookings")
              .select(BOOKING_SELECT)
              .gte("check_in", from)
              .lte("check_in", to)
              .neq("status", "cancelada")
              .order("check_in")
              .range(a, b) as unknown as PromiseLike<{
              data: BookingRow[] | null;
              error: { message: string } | null;
            }>,
        )
      ).filter(
        (r) =>
          !property ||
          includes(r.room?.name, property) ||
          includes(r.room?.property?.name, property),
      );

      const summarize = (items: BookingRow[]) => ({
        reservas: items.length,
        noites: items.reduce(
          (s, r) => s + diffDaysISO(r.check_in, r.check_out),
          0,
        ),
        faturacao_eur: round(items.reduce((s, r) => s + r.total_amount, 0)),
        ja_pago_eur: round(
          items.reduce(
            (s, r) => s + (r.payments ?? []).reduce((p, x) => p + x.amount, 0),
            0,
          ),
        ),
      });

      const keyOf = (r: BookingRow) =>
        groupBy === "property"
          ? (r.room?.property?.name ?? "Sem alojamento")
          : groupBy === "channel"
            ? (r.channel ?? "Sem canal")
            : r.check_in.slice(0, 7);

      const result: Record<string, unknown> = {
        intervalo: { de: from, ate: to },
        criterio: "reservas não canceladas com check-in no intervalo",
        total: summarize(rows),
      };

      if (groupBy !== "none") {
        const groups = new Map<string, BookingRow[]>();
        for (const r of rows) {
          const key = keyOf(r);
          groups.set(key, [...(groups.get(key) ?? []), r]);
        }
        result.por_grupo = Array.from(groups.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([grupo, items]) => ({ grupo, ...summarize(items) }));
      }

      return result;
    },
  },
  {
    name: "get_cash_flow",
    description:
      "Fluxo de caixa num intervalo: total de entradas e saídas, saldo e totais por categoria (despesas, faturas, etc.).",
    permissions: ["caixa"],
    parameters: {
      type: "OBJECT",
      properties: {
        from: {
          type: "STRING",
          description: "Data inicial YYYY-MM-DD (inclusive).",
        },
        to: {
          type: "STRING",
          description: "Data final YYYY-MM-DD (inclusive).",
        },
      },
      required: ["from", "to"],
    },
    async run(supabase, args) {
      const { from, to } = range(args);
      type Tx = {
        type: string;
        amount: number;
        category: string | null;
        cost_type: string | null;
      };
      const rows = await fetchAll<Tx>(
        (a, b) =>
          supabase
            .from("cash_transactions")
            .select("type, amount, category, cost_type")
            .gte("transaction_date", from)
            .lte("transaction_date", to)
            .order("transaction_date")
            .range(a, b) as unknown as PromiseLike<{
            data: Tx[] | null;
            error: { message: string } | null;
          }>,
      );

      const sum = (type: string) =>
        round(
          rows.filter((r) => r.type === type).reduce((s, r) => s + r.amount, 0),
        );
      const byCategory = new Map<string, number>();
      for (const r of rows) {
        const key = `${r.type}: ${r.category ?? "Sem categoria"}`;
        byCategory.set(key, (byCategory.get(key) ?? 0) + r.amount);
      }

      return {
        intervalo: { de: from, ate: to },
        entradas_eur: sum("entrada"),
        saidas_eur: sum("saida"),
        saldo_eur: round(sum("entrada") - sum("saida")),
        movimentos: rows.length,
        por_categoria: Array.from(byCategory.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([categoria, total]) => ({
            categoria,
            total_eur: round(total),
          })),
      };
    },
  },
  {
    name: "get_cleaning_tasks",
    description:
      "Tarefas de limpeza num intervalo de datas: quarto, dia, estado (pendente, em_curso, concluida) e responsável.",
    permissions: ["limpeza", "gerir_limpeza", "equipas"],
    parameters: {
      type: "OBJECT",
      properties: {
        from: {
          type: "STRING",
          description: "Data inicial YYYY-MM-DD (inclusive).",
        },
        to: {
          type: "STRING",
          description: "Data final YYYY-MM-DD (inclusive).",
        },
        status: {
          type: "STRING",
          description: "Filtrar por estado (opcional).",
          enum: ["pendente", "em_curso", "concluida"],
        },
      },
      required: ["from", "to"],
    },
    async run(supabase, args) {
      const { from, to } = range(args);
      let q = supabase
        .from("cleaning_tasks")
        .select(
          "task_date, status, source, room:rooms(name), assignee:staff(name)",
        )
        .gte("task_date", from)
        .lte("task_date", to)
        .order("task_date")
        .limit(MAX_ROWS);
      if (typeof args.status === "string") q = q.eq("status", args.status);
      const { data, error } = await q;
      if (error) throw new Error("Não foi possível ler as limpezas.");
      return (data ?? []).map((t) => ({
        dia: t.task_date,
        unidade: (t.room as unknown as { name: string } | null)?.name ?? null,
        estado: t.status,
        origem: t.source,
        responsavel:
          (t.assignee as unknown as { name: string } | null)?.name ?? null,
      }));
    },
  },
  {
    name: "get_maintenance_issues",
    description:
      "Problemas de manutenção reportados: título, prioridade, estado (reportado, em_curso, resolvido) e unidade.",
    permissions: ["manutencao", "equipas"],
    parameters: {
      type: "OBJECT",
      properties: {
        status: {
          type: "STRING",
          description:
            "Filtrar por estado (opcional). Por defeito, só os não resolvidos.",
          enum: ["reportado", "em_curso", "resolvido"],
        },
      },
    },
    async run(supabase, args) {
      let q = supabase
        .from("maintenance_issues")
        .select("title, priority, status, created_at, room:rooms(name)")
        .order("created_at", { ascending: false })
        .limit(MAX_ROWS);
      q =
        typeof args.status === "string"
          ? q.eq("status", args.status)
          : q.neq("status", "resolvido");
      const { data, error } = await q;
      if (error) throw new Error("Não foi possível ler a manutenção.");
      return (data ?? []).map((i) => ({
        titulo: i.title,
        prioridade: i.priority,
        estado: i.status,
        unidade: (i.room as unknown as { name: string } | null)?.name ?? null,
        reportado_em: i.created_at,
      }));
    },
  },
  {
    name: "search_guests",
    description:
      "Procura hóspedes pelo nome: nacionalidade, nº de visitas, última estadia e total gasto. Não devolve contactos nem documentos.",
    permissions: ["hospedes"],
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Parte do nome do hóspede." },
      },
      required: ["name"],
    },
    async run(supabase, args) {
      const name = textArg(args, "name");
      if (!name) throw new Error('Indica o "name" a procurar.');
      const { data, error } = await supabase
        .from("guests")
        .select("name, nationality, visit_count, last_stay_at, total_spent")
        .ilike("name", `%${name.replace(/[%_]/g, "")}%`)
        .limit(20);
      if (error) throw new Error("Não foi possível ler os hóspedes.");
      return (data ?? []).map((g) => ({
        nome: g.name,
        nacionalidade: g.nationality,
        visitas: g.visit_count,
        ultima_estadia: g.last_stay_at,
        total_gasto_eur: g.total_spent,
      }));
    },
  },
];

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toolsFor(permissions: PermissionKey[]): AssistantTool[] {
  return ASSISTANT_TOOLS.filter(
    (tool) =>
      tool.permissions.length === 0 ||
      tool.permissions.some((p) => permissions.includes(p)),
  );
}
