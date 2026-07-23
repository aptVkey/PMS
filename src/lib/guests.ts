export const DOCUMENT_TYPES = [
  "cartao_cidadao",
  "passaporte",
  "bilhete_identidade",
  "carta_conducao",
  "outro",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  cartao_cidadao: "Cartão de Cidadão",
  passaporte: "Passaporte",
  bilhete_identidade: "Bilhete de Identidade",
  carta_conducao: "Carta de Condução",
  outro: "Outro",
};

export type Guest = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  nationality: string | null;
  document_type: string | null;
  document_number: string | null;
  notes: string | null;
  visit_count: number;
  last_stay_at: string | null;
  avg_spent: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
};
