export const ROOM_TYPES = [
  "quarto_duplo",
  "quarto_individual",
  "suite",
  "apartamento_inteiro",
  "estudio",
  "outro",
] as const;

export type RoomType = (typeof ROOM_TYPES)[number];

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  quarto_duplo: "Quarto Duplo",
  quarto_individual: "Quarto Individual",
  suite: "Suite",
  apartamento_inteiro: "Apartamento Inteiro",
  estudio: "Estúdio",
  outro: "Outro",
};

export const AMENITIES = [
  "Wi-Fi",
  "Ar condicionado",
  "Aquecimento",
  "Cozinha equipada",
  "Máquina de lavar roupa",
  "TV",
  "Secador de cabelo",
  "Ferro de engomar",
  "Elevador",
  "Estacionamento gratuito",
  "Vista mar",
  "Varanda",
  "Pequeno-almoço incluído",
  "Não fumadores",
  "Animais permitidos",
  "Check-in autónomo",
] as const;

export const BED_TYPES = [
  "casal",
  "casal_king",
  "solteiro",
  "beliche",
  "sofa_cama",
  "berco",
] as const;

export type BedType = (typeof BED_TYPES)[number];

export const BED_TYPE_LABELS: Record<BedType, string> = {
  casal: "Cama de casal",
  casal_king: "Cama de casal King",
  solteiro: "Cama de solteiro",
  beliche: "Beliche",
  sofa_cama: "Sofá-cama",
  berco: "Berço",
};

export type BedRow = {
  type: BedType;
  count: number;
};

export type BedroomConfig = {
  beds: BedRow[];
};

export type BathroomConfig = {
  ensuiteBedroomIndex: number | null;
};

export type Room = {
  id: string;
  property_id: string;
  name: string;
  type: RoomType;
  typology_id: string | null;
  description: string | null;
  capacity_adults: number;
  capacity_children: number;
  capacity_infants: number;
  bedrooms: BedroomConfig[];
  bathrooms: BathroomConfig[];
  size_m2: number | null;
  base_price: number;
  min_stay_nights: number | null;
  currency: string;
  amenities: string[];
  photos: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
};
