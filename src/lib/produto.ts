/** Produto como a API devolve em GET /api/produtos. */
export type ProdutoApi = {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string | null;
  /** esgotado no dia de hoje; volta sozinho no dia seguinte */
  esgotado: boolean;
  /** o "sabor da semana" (no máximo um) */
  destaque: boolean;
};

const booleanoOuAusente = (valor: unknown) => valor === undefined || typeof valor === "boolean";

function ehProdutoApi(item: unknown): item is Record<string, unknown> {
  if (typeof item !== "object" || item === null) return false;
  const p = item as Record<string, unknown>;
  return (
    Number.isInteger(p.id) &&
    typeof p.nome === "string" &&
    (typeof p.descricao === "string" || p.descricao === null) &&
    typeof p.preco === "number" && Number.isFinite(p.preco) && p.preco >= 0 &&
    // só caminho relativo da própria API: uma URL completa aqui faria a página
    // carregar imagem de qualquer servidor
    (p.imagem === null || (typeof p.imagem === "string" && p.imagem.startsWith("/api/"))) &&
    // ausentes numa API anterior a esses campos: valem como false
    booleanoOuAusente(p.esgotado) &&
    booleanoOuAusente(p.destaque)
  );
}

/**
 * Confere o formato do que veio da rede antes de usar. Itens fora do formato são
 * descartados; se a resposta nem for uma lista, devolve null.
 */
export function lerProdutosApi(bruto: unknown): ProdutoApi[] | null {
  if (!Array.isArray(bruto)) return null;
  return bruto.filter(ehProdutoApi).map((p) => ({
    id: p.id as number,
    nome: p.nome as string,
    descricao: (p.descricao as string | null) ?? "",
    preco: p.preco as number,
    imagem: p.imagem as string | null,
    esgotado: p.esgotado === true,
    destaque: p.destaque === true,
  }));
}

/** Lê um produto só (respostas de POST, PUT e PATCH). */
export function lerProdutoApi(bruto: unknown): ProdutoApi | null {
  return lerProdutosApi([bruto])?.[0] ?? null;
}
