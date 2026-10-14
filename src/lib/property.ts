export const PROPERTY_TYPES = ["unidade_singular", "multi_unidade"] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  unidade_singular: "Unidade singular",
  multi_unidade: "Multi unidade",
};

export type Property = {
  id: string;
  name: string;
  property_type: PropertyType;
  description: string | null;
  // "HH:MM:SS" (coluna time). Usadas pelos gatilhos de email relativos ao
  // check-in/checkout. Opcionais porque nem todas as queries as selecionam.
  check_in_time?: string;
  check_out_time?: string;
  created_at: string;
  updated_at: string;
};
