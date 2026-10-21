import { lerProdutosApi } from "@/lib/produto";

export type Produto = {
  id: string;
  nome: string;
  preco: number;
  img: string | null;
  esgotado: boolean;
  destaque: boolean;
};

/**
 * Lista de reserva. O catálogo de verdade vem da API, mas no plano gratuito do
 * Render o servidor hiberna e a primeira resposta pode levar meio minuto — a loja
 * não pode ficar vazia nesse tempo. Então ela abre com esta lista e troca pelos
 * dados reais assim que chegarem.
 */
export const RESERVA: Produto[] = [
  { id: "chocolate-wafer", nome: "Chocolate com wafer", preco: 16, img: "/images/menu-chocolate-wafer-440.webp", esgotado: false, destaque: false },
  { id: "morango-creme", nome: "Morango com creme", preco: 15, img: "/images/menu-morango-creme-440.webp", esgotado: false, destaque: false },
  { id: "cookies", nome: "Cookies com chocolate", preco: 17, img: "/images/menu-cookies-440.webp", esgotado: false, destaque: false },
  { id: "doce-de-leite", nome: "Doce de leite com brigadeiro", preco: 17, img: "/images/menu-doce-de-leite-440.webp", esgotado: false, destaque: false },
  { id: "maracuja", nome: "Maracujá com chocolate branco", preco: 18, img: "/images/menu-maracuja-440.webp", esgotado: false, destaque: false },
];

/** O sabor da semana abre o menu; os demais seguem na ordem definida no painel. */
export function ordenarParaMenu(produtos: readonly Produto[]): Produto[] {
  return [...produtos.filter((p) => p.destaque), ...produtos.filter((p) => !p.destaque)];
}

/** Converte a resposta da API para o catálogo da loja. Lista vazia ou inválida devolve null. */
export function catalogoDaApi(bruto: unknown, api: string): Produto[] | null {
  const produtos = lerProdutosApi(bruto);
  if (!produtos || produtos.length === 0) return null;
  return produtos.map((p) => ({
    id: String(p.id),
    nome: p.nome,
    preco: p.preco,
    img: p.imagem ? api + p.imagem : null,
    esgotado: p.esgotado,
    destaque: p.destaque,
  }));
}
