import { describe, expect, it } from "vitest";
import {
  carrinhoSalvo,
  mensagemPedido,
  mudarQuantidade,
  reconciliar,
  serializar,
  totalItens,
  totalValor,
} from "./carrinho";
import { catalogoDaApi, type Produto } from "./catalogo";

const produtos: Produto[] = [
  { id: "morango", nome: "Morango com creme", preco: 15, img: null },
  { id: "chocolate", nome: "Chocolate com wafer", preco: 16, img: null },
];

describe("mudarQuantidade", () => {
  it("soma e subtrai sem alterar o carrinho original", () => {
    const vazio = new Map<string, number>();
    const um = mudarQuantidade(vazio, "morango", 1);
    const dois = mudarQuantidade(um, "morango", 1);
    expect(dois.get("morango")).toBe(2);
    expect(um.get("morango")).toBe(1);
    expect(vazio.size).toBe(0);
  });

  it("remove o item quando a quantidade chega a zero", () => {
    const carrinho = mudarQuantidade(new Map([["morango", 1]]), "morango", -1);
    expect(carrinho.has("morango")).toBe(false);
  });
});

describe("totais", () => {
  it("conta itens e soma o valor pelo preço do catálogo", () => {
    const carrinho = new Map([["morango", 1], ["chocolate", 2]]);
    expect(totalItens(carrinho)).toBe(3);
    expect(totalValor(carrinho, produtos)).toBe(47);
  });
});

describe("reconciliar", () => {
  it("descarta o que saiu do catálogo e mantém o resto", () => {
    const carrinho = reconciliar(new Map([["morango", 2], ["sumiu", 1]]), produtos);
    expect([...carrinho]).toEqual([["morango", 2]]);
  });
});

describe("carrinhoSalvo", () => {
  it("lê de volta o que foi serializado", () => {
    const carrinho = new Map([["morango", 2]]);
    expect([...carrinhoSalvo(serializar(carrinho))]).toEqual([["morango", 2]]);
  });

  it("ignora JSON quebrado, formato errado e quantidade inválida", () => {
    expect(carrinhoSalvo("{não é json").size).toBe(0);
    expect(carrinhoSalvo('{"morango": 2}').size).toBe(0);
    const bruto = JSON.stringify([
      ["morango", 0],
      ["morango", 1.5],
      ["chocolate", "3"],
      [42, 1],
      ["chocolate", 2],
    ]);
    expect([...carrinhoSalvo(bruto)]).toEqual([["chocolate", 2]]);
  });

  it("começa vazio quando não há nada salvo", () => {
    expect(carrinhoSalvo(null).size).toBe(0);
  });

  it("guarda itens que ainda não estão no catálogo, para a API confirmar depois", () => {
    // ao abrir a página o catálogo é a reserva; o id "7" só existe na API
    const salvo = carrinhoSalvo(JSON.stringify([["7", 2]]));
    expect(reconciliar(salvo, produtos).size).toBe(0);
    const daApi: Produto[] = [{ id: "7", nome: "Ninho", preco: 18, img: null }];
    expect([...reconciliar(salvo, daApi)]).toEqual([["7", 2]]);
  });
});

describe("mensagemPedido", () => {
  it("monta o texto com itens, total e entrega", () => {
    const carrinho = new Map([["morango", 1], ["chocolate", 2]]);
    expect(mensagemPedido(carrinho, produtos, "Entrega em: Rua das Palmeiras, 320")).toBe(
      "Olá! Quero fazer um pedido no Doce Sabor:\n\n" +
        "• Bolo de pote sabor Morango com creme — 1 un — R$ 15,00\n" +
        "• Bolo de pote sabor Chocolate com wafer — 2 un — R$ 32,00\n\n" +
        "Total: R$ 47,00\n\n" +
        "Entrega em: Rua das Palmeiras, 320",
    );
  });
});

describe("catalogoDaApi", () => {
  const api = "https://api.exemplo";

  it("converte a resposta da API e monta a URL da imagem", () => {
    const bruto = [{ id: 7, nome: "Ninho", descricao: null, preco: 18.5, imagem: "/api/produtos/7/imagem" }];
    expect(catalogoDaApi(bruto, api)).toEqual([
      { id: "7", nome: "Ninho", preco: 18.5, img: "https://api.exemplo/api/produtos/7/imagem" },
    ]);
  });

  it("descarta itens fora do formato, inclusive imagem de outro servidor", () => {
    const bruto = [
      { id: 1, nome: "Ok", descricao: "", preco: 10, imagem: null },
      { id: 2, nome: "Preço texto", descricao: "", preco: "10", imagem: null },
      { id: 3, nome: "Imagem externa", descricao: "", preco: 10, imagem: "https://malicioso/x.jpg" },
      { id: 4, nome: "Negativo", descricao: "", preco: -1, imagem: null },
    ];
    expect(catalogoDaApi(bruto, api)?.map((p) => p.id)).toEqual(["1"]);
  });

  it("devolve null para resposta que não é lista ou lista vazia", () => {
    expect(catalogoDaApi({ erro: "x" }, api)).toBeNull();
    expect(catalogoDaApi([], api)).toBeNull();
  });
});
