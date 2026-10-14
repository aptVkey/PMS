// Mapeia a nacionalidade (guardada em português, ver lib/guests.ts) para o
// nome do país tal como aparece no mapa (public/world-110m.json, em inglês
// — a fonte de dados do mapa-múndi). Cobre todas as nacionalidades já vistas
// nas reservas importadas; países sem entrada aqui simplesmente não pintam
// no mapa, mas continuam a aparecer normalmente nas tabelas.
export const NATIONALITY_TO_MAP_NAME: Record<string, string> = {
  Alemanha: "Germany",
  Argentina: "Argentina",
  Austrália: "Australia",
  Áustria: "Austria",
  "África do Sul": "South Africa",
  Bélgica: "Belgium",
  Brasil: "Brazil",
  Canadá: "Canada",
  Colômbia: "Colombia",
  "Coreia do Sul": "South Korea",
  Croácia: "Croatia",
  Dinamarca: "Denmark",
  Eslováquia: "Slovakia",
  Eslovénia: "Slovenia",
  Espanha: "Spain",
  "Estados Unidos": "United States of America",
  Finlândia: "Finland",
  França: "France",
  Grécia: "Greece",
  Hungria: "Hungary",
  Índia: "India",
  Irlanda: "Ireland",
  Islândia: "Iceland",
  Itália: "Italy",
  Japão: "Japan",
  Lituânia: "Lithuania",
  Luxemburgo: "Luxembourg",
  México: "Mexico",
  Marrocos: "Morocco",
  Noruega: "Norway",
  "Países Baixos": "Netherlands",
  Polónia: "Poland",
  Portugal: "Portugal",
  "Reino Unido": "United Kingdom",
  Roménia: "Romania",
  Suécia: "Sweden",
  Suíça: "Switzerland",
  Tailândia: "Thailand",
  Turquia: "Turkey",
  Ucrânia: "Ukraine",
};

// Sentido inverso, para mostrar o nome do país em português no mapa (ver
// world-map.tsx). Países sem reservas mostram o nome em inglês tal como
// vem do mapa-múndi, já que não há nenhuma nacionalidade em português para
// traduzir de volta.
export const MAP_NAME_TO_NATIONALITY: Record<string, string> = Object.entries(
  NATIONALITY_TO_MAP_NAME,
).reduce<Record<string, string>>((acc, [nationality, mapName]) => {
  acc[mapName] = nationality;
  return acc;
}, {});
