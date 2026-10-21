/** Produto como a API devolve em GET /api/produtos. */
export type ProdutoApi = {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string | null;
};

function ehProdutoApi(item: unknown): item is ProdutoApi {
  if (typeof item !== "object" || item === null) return false;
  const p = item as Record<string, unknown>;
  return (
    Number.isInteger(p.id) &&
    typeof p.nome === "string" &&
    (typeof p.descricao === "string" || p.descricao === null) &&
    typeof p.preco === "number" && Number.isFinite(p.preco) && p.preco >= 0 &&
    // só caminho relativo da própria API: uma URL completa aqui faria a página
    // carregar imagem de qualquer servidor
    (p.imagem === null || (typeof p.imagem === "string" && p.imagem.startsWith("/api/")))
  );
}

/**
 * Confere o formato do que veio da rede antes de usar. Itens fora do formato são
 * descartados; se a resposta nem for uma lista, devolve null.
 */
export function lerProdutosApi(bruto: unknown): ProdutoApi[] | null {
  if (!Array.isArray(bruto)) return null;
  return bruto.filter(ehProdutoApi).map((p) => ({ ...p, descricao: p.descricao ?? "" }));
}
