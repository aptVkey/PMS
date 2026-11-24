// O Supabase devolve no máximo 1000 linhas por pedido e corta o resto SEM
// avisar. Para listas que podem crescer (reservas, hóspedes, movimentos de
// caixa), lê-se página a página até ao fim.
//
// A consulta tem de ter uma ordenação estável (ex.: terminar em .order("id"))
// para as páginas não repetirem nem saltarem linhas.
type PageResult = PromiseLike<{ data: unknown[] | null; error: unknown }>;

const PAGE_SIZE = 1000;
const MAX_PAGES = 50; // 50 000 linhas: muito acima do volume esperado

export async function fetchAll<T>(
  buildPage: (from: number, to: number) => PageResult,
): Promise<{ data: T[]; error: unknown }> {
  const rows: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await buildPage(from, from + PAGE_SIZE - 1);
    if (error) return { data: rows, error };
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return { data: rows, error: null };
}
