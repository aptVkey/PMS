// Canais de reserva suportados pela ligação iCal. O nome (`name`) é o que
// fica guardado em ical_feeds.channel e em bookings.channel.
export const CHANNELS = [
  {
    key: "booking",
    name: "Booking.com",
    initial: "B",
    color: "#003580",
    tagline: "Importa reservas e bloqueia as datas ocupadas",
    // Aceita o link que o próprio canal gera (para avisar se colarem o de outro).
    host: /booking\.com/i,
    importSteps: [
      "Abre a Extranet da Booking.com e escolhe o alojamento.",
      "Vai a Tarifas e disponibilidade → Sincronizar calendários.",
      "Em «Exportar calendário», copia o link (termina em .ics).",
    ],
    exportSteps: [
      "Na mesma página, em «Importar calendário», clica em «Adicionar calendário».",
      "Cola o link do PMS (abaixo), dá-lhe um nome e guarda.",
    ],
  },
  {
    key: "airbnb",
    name: "Airbnb",
    initial: "A",
    color: "#e0314b",
    tagline: "Importa reservas e bloqueia as datas ocupadas",
    host: /airbnb\./i,
    importSteps: [
      "Abre o anúncio no Airbnb e vai a Calendário → Disponibilidade.",
      "Escolhe «Ligar calendários» e depois «Exportar calendário».",
      "Copia o link que aparece.",
    ],
    exportSteps: [
      "Na mesma janela, escolhe «Importar calendário».",
      "Cola o link do PMS (abaixo), dá-lhe um nome e guarda.",
    ],
  },
  {
    key: "vrbo",
    name: "VRBO",
    initial: "V",
    color: "#245abc",
    tagline: "Importa reservas e bloqueia as datas ocupadas",
    host: /(vrbo|homeaway|expedia)\./i,
    importSteps: [
      "Abre o anúncio no VRBO e vai a Calendário.",
      "Escolhe «Importar/exportar calendário» e copia o link de exportação (iCal).",
    ],
    exportSteps: [
      "No mesmo sítio, em «Importar calendário», cola o link do PMS (abaixo).",
      "Dá-lhe um nome e guarda.",
    ],
  },
] as const;

export type ChannelDef = (typeof CHANNELS)[number];

// "Outro": qualquer canal que publique iCal (Expedia, Holidu, etc.).
export const OTHER_CHANNEL = {
  key: "outro",
  name: "Outro canal",
  initial: "+",
  color: "#595959",
  tagline: "Qualquer canal que publique um calendário iCal",
  host: /./,
  importSteps: [
    "No canal, procura «sincronizar calendário» ou «iCal».",
    "Copia o link de exportação do calendário (termina em .ics).",
  ],
  exportSteps: [
    "No mesmo sítio, procura «importar calendário».",
    "Cola o link do PMS (abaixo) e guarda.",
  ],
} as const;

export type AnyChannelDef = ChannelDef | typeof OTHER_CHANNEL;

// Devolve a definição do canal a partir do nome guardado ("booking.com",
// "Airbnb"...). Nomes desconhecidos caem em "Outro".
export function channelFromName(name: string): AnyChannelDef {
  const normalized = name.trim().toLowerCase();
  return (
    CHANNELS.find(
      (c) => c.name.toLowerCase() === normalized || c.key === normalized,
    ) ?? OTHER_CHANNEL
  );
}
