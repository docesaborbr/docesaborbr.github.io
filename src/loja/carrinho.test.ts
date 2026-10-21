import { describe, expect, it } from "vitest";
import {
  carrinhoSalvo,
  esgotadosNoCarrinho,
  mensagemPedido,
  migrarDaReserva,
  mudarQuantidade,
  pedivel,
  reconciliar,
  serializar,
  totalItens,
  totalValor,
} from "./carrinho";
import { catalogoDaApi, ordenarParaMenu, type Produto } from "./catalogo";

const sabor = (id: string, nome: string, preco: number, extra: Partial<Produto> = {}): Produto => ({
  id,
  nome,
  preco,
  img: null,
  esgotado: false,
  destaque: false,
  ...extra,
});

const produtos: Produto[] = [sabor("morango", "Morango com creme", 15), sabor("chocolate", "Chocolate com wafer", 16)];

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
    const daApi: Produto[] = [sabor("7", "Ninho", 18)];
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
      sabor("7", "Ninho", 18.5, { img: "https://api.exemplo/api/produtos/7/imagem" }),
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

describe("esgotado hoje", () => {
  const catalogo = [sabor("morango", "Morango com creme", 15, { esgotado: true }), sabor("chocolate", "Chocolate com wafer", 16)];
  const carrinho = new Map([["morango", 2], ["chocolate", 1]]);

  it("fica fora do pedido, do total e da mensagem", () => {
    const pedido = pedivel(carrinho, catalogo);
    expect([...pedido]).toEqual([["chocolate", 1]]);
    expect(totalValor(pedido, catalogo)).toBe(16);
    expect(mensagemPedido(pedido, catalogo, "Retirada")).not.toContain("Morango");
  });

  it("continua guardado (volta amanhã) e é avisado pelo nome", () => {
    expect([...reconciliar(carrinho, catalogo)]).toEqual([["morango", 2], ["chocolate", 1]]);
    expect(esgotadosNoCarrinho(carrinho, catalogo)).toEqual(["Morango com creme"]);
  });
});

describe("migrarDaReserva", () => {
  const reserva = [sabor("morango-creme", "Morango com creme", 15), sabor("maracuja", "Maracujá com chocolate branco", 18)];
  const daApi = [sabor("3", "morango  com Creme", 15), sabor("9", "Maracuja com chocolate branco", 18), sabor("4", "Ninho", 17)];

  it("troca o item da reserva pelo produto de mesmo nome, ignorando acento e maiúscula", () => {
    const migrado = migrarDaReserva(new Map([["morango-creme", 2], ["maracuja", 1]]), reserva, daApi);
    expect([...migrado]).toEqual([["3", 2], ["9", 1]]);
  });

  it("soma com o que já estava no id da API e mantém o que já era da API", () => {
    const migrado = migrarDaReserva(new Map([["3", 1], ["morango-creme", 2], ["4", 1]]), reserva, daApi);
    expect([...migrado]).toEqual([["3", 3], ["4", 1]]);
  });

  it("deixa como está o que não tem par (reconciliar tira depois)", () => {
    const migrado = migrarDaReserva(new Map([["cookies", 1]]), reserva, daApi);
    expect(reconciliar(migrado, daApi).size).toBe(0);
  });
});

describe("ordenarParaMenu", () => {
  it("põe o sabor da semana primeiro e mantém a ordem dos outros", () => {
    const lista = [sabor("a", "A", 1), sabor("b", "B", 1), sabor("c", "C", 1, { destaque: true }), sabor("d", "D", 1)];
    expect(ordenarParaMenu(lista).map((p) => p.id)).toEqual(["c", "a", "b", "d"]);
  });
});

describe("catalogoDaApi com esgotado e destaque", () => {
  const api = "https://api.exemplo";

  it("lê os campos novos e trata a ausência (API antiga) como false", () => {
    const bruto = [
      { id: 1, nome: "A", descricao: "", preco: 10, imagem: null, esgotado: true, destaque: true },
      { id: 2, nome: "B", descricao: "", preco: 10, imagem: null },
    ];
    expect(catalogoDaApi(bruto, api)?.map((p) => [p.esgotado, p.destaque])).toEqual([[true, true], [false, false]]);
  });

  it("descarta item com esgotado ou destaque fora do formato", () => {
    const bruto = [
      { id: 1, nome: "A", descricao: "", preco: 10, imagem: null, esgotado: "sim" },
      { id: 2, nome: "B", descricao: "", preco: 10, imagem: null, destaque: 1 },
      { id: 3, nome: "C", descricao: "", preco: 10, imagem: null },
    ];
    expect(catalogoDaApi(bruto, api)?.map((p) => p.id)).toEqual(["3"]);
  });
});
