import { emReais } from "@/lib/dinheiro";
import type { Produto } from "./catalogo";

/** id do produto -> quantidade. Nunca guarda preço: o valor vem sempre do catálogo atual. */
export type Carrinho = ReadonlyMap<string, number>;

const buscar = (produtos: readonly Produto[], id: string) => produtos.find((p) => p.id === id);

export function mudarQuantidade(carrinho: Carrinho, id: string, delta: number): Carrinho {
  const nova = (carrinho.get(id) ?? 0) + delta;
  const proximo = new Map(carrinho);
  if (nova > 0) proximo.set(id, nova);
  else proximo.delete(id);
  return proximo;
}

/** Mantém só o que continua existindo no catálogo (ele muda quando a API responde). */
export function reconciliar(carrinho: Carrinho, produtos: readonly Produto[]): Carrinho {
  return new Map([...carrinho].filter(([id]) => buscar(produtos, id)));
}

export const totalItens = (carrinho: Carrinho): number =>
  [...carrinho.values()].reduce((a, b) => a + b, 0);

export function totalValor(carrinho: Carrinho, produtos: readonly Produto[]): number {
  return [...carrinho].reduce((soma, [id, qtd]) => soma + (buscar(produtos, id)?.preco ?? 0) * qtd, 0);
}

/**
 * Lê o carrinho salvo no navegador. O conteúdo veio do cliente, então só entra
 * par com id em texto e quantidade inteira positiva.
 *
 * Não filtra pelo catálogo: ao abrir a página ele ainda é a lista de reserva, cujos
 * ids não batem com os da API — filtrar aqui apagava o carrinho a cada recarga.
 * Quem cruza com o catálogo é `reconciliar`, quando ele já está carregado.
 */
export function carrinhoSalvo(json: string | null): Carrinho {
  const carrinho = new Map<string, number>();
  let bruto: unknown;
  try {
    bruto = JSON.parse(json ?? "[]");
  } catch {
    return carrinho;
  }
  if (!Array.isArray(bruto)) return carrinho;

  for (const par of bruto) {
    if (!Array.isArray(par) || par.length !== 2) continue;
    const [id, qtd] = par as unknown[];
    if (typeof id !== "string" || !Number.isInteger(qtd) || (qtd as number) < 1) continue;
    carrinho.set(id, qtd as number);
  }
  return carrinho;
}

export const serializar = (carrinho: Carrinho): string => JSON.stringify([...carrinho]);

/** O texto que chega no WhatsApp da loja. */
export function mensagemPedido(carrinho: Carrinho, produtos: readonly Produto[], entrega: string): string {
  const linhas = [...carrinho].flatMap(([id, qtd]) => {
    const p = buscar(produtos, id);
    return p ? ["• Bolo de pote sabor " + p.nome + " — " + qtd + " un — " + emReais(p.preco * qtd)] : [];
  });

  return (
    "Olá! Quero fazer um pedido no Doce Sabor:\n\n" +
    linhas.join("\n") +
    "\n\nTotal: " + emReais(totalValor(carrinho, produtos)) +
    "\n\n" + entrega
  );
}
