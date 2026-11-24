// Configuração do website público (/site). Edita aqui o nome, os textos e os
// contactos — os campos de contacto a `null` simplesmente não aparecem.
export const SITE = {
  name: "Estadia Direta",
  tagline: "Casas para ficar · Reserva direta",
  heroTitle: "Casas onde o tempo abranda.",
  heroSubtitle:
    "Apartamentos e casas escolhidos a dedo, cuidados por quem os conhece de cor. Reservas connosco, sem intermediários — e do outro lado está sempre uma pessoa.",
  contact: {
    email: null as string | null,
    phone: null as string | null,
    address: null as string | null,
  },
};

// Navegação do website (cabeçalho, menu móvel e rodapé).
export const SITE_LINKS = [
  { href: "/site#alojamentos", label: "Casas" },
  { href: "/site#como-funciona", label: "Como funciona" },
  { href: "/site#reviews", label: "Hóspedes" },
  { href: "/site/contactos", label: "Contactos" },
];
