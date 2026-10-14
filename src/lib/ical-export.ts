import "server-only";

type ExportableBooking = {
  id: string;
  check_in: string;
  check_out: string;
};

function toIcsDate(isoDate: string): string {
  return isoDate.replaceAll("-", "");
}

function nowStamp(): string {
  return `${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

// Gera um feed iCal mínimo, só com datas ocupadas — nunca inclui nome, email
// ou qualquer outro dado do hóspede, porque este URL é entregue a terceiros
// (Booking.com, Airbnb) para bloquearem disponibilidade.
export function buildIcsExport(bookings: ExportableBooking[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PMS//iCal Export//PT",
    "CALSCALE:GREGORIAN",
  ];

  for (const booking of bookings) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:booking-${booking.id}@pms-export`,
      `DTSTAMP:${nowStamp()}`,
      `DTSTART;VALUE=DATE:${toIcsDate(booking.check_in)}`,
      `DTEND;VALUE=DATE:${toIcsDate(booking.check_out)}`,
      "SUMMARY:Reservado",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
