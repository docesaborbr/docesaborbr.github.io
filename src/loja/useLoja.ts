import { useCallback, useEffect, useMemo, useState } from "react";
import { API } from "@/config";
import { carrinhoSalvo, mudarQuantidade, reconciliar, serializar, type Carrinho } from "./carrinho";
import { catalogoDaApi, RESERVA, type Produto } from "./catalogo";

/**
 * O carrinho sobrevive a recarregar a página. Fica em localStorage porque o cliente
 * costuma sair para conferir um sabor, trocar de aba ou atender uma ligação no meio
 * do pedido — e voltar para um carrinho vazio faz ele começar tudo de novo.
 */
const CHAVE_CARRINHO = "ds_carrinho";

function lerArmazenado(): string | null {
  try {
    return localStorage.getItem(CHAVE_CARRINHO);
  } catch {
    return null; // navegação anônima ou armazenamento bloqueado
  }
}

function gravar(carrinho: Carrinho): void {
  try {
    localStorage.setItem(CHAVE_CARRINHO, serializar(carrinho));
  } catch {
    /* segue sem persistir */
  }
}

/** Estado antes de ler o que está salvo. Gravá-lo apagaria o carrinho guardado. */
const AINDA_NAO_LIDO: Carrinho = new Map();

export function useLoja() {
  const [produtos, setProdutos] = useState<Produto[]>(RESERVA);
  // O que está salvo, inclusive itens que o catálogo atual ainda não confirmou.
  // Começa vazio também no navegador: a página chega renderizada do build, e o
  // primeiro render precisa bater com aquele HTML. O salvo entra logo em seguida.
  const [guardado, setGuardado] = useState<Carrinho>(AINDA_NAO_LIDO);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);

  useEffect(() => setGuardado(carrinhoSalvo(lerArmazenado())), []);

  useEffect(() => {
    if (guardado !== AINDA_NAO_LIDO) gravar(guardado);
  }, [guardado]);

  // Busca o catálogo na API. Se falhar, a loja segue com a lista de reserva.
  useEffect(() => {
    const controle = new AbortController();
    fetch(API + "/api/produtos", { signal: controle.signal })
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((bruto: unknown) => {
        const vindos = catalogoDaApi(bruto, API);
        if (!vindos) return;
        setProdutos(vindos);
        setGuardado((atual) => reconciliar(atual, vindos));
      })
      .catch(() => {
        /* servidor fora do ar: a lista de reserva continua valendo */
      });
    return () => controle.abort();
  }, []);

  const carrinho = useMemo(() => reconciliar(guardado, produtos), [guardado, produtos]);

  const mudar = useCallback(
    (id: string, delta: number) => {
      if (!produtos.some((p) => p.id === id)) return;
      if (delta > 0) setPedidoEnviado(false);
      setGuardado((atual) => mudarQuantidade(atual, id, delta));
    },
    [produtos],
  );

  const esvaziar = useCallback(() => {
    setGuardado(new Map());
    setPedidoEnviado(false);
  }, []);

  // O pedido já foi para o WhatsApp: segurar os itens aqui faria o próximo pedido
  // começar com o anterior dentro, sem que ninguém tenha pedido isso.
  const concluirPedido = useCallback(() => {
    setGuardado(new Map());
    setPedidoEnviado(true);
  }, []);

  return { produtos, carrinho, mudar, esvaziar, concluirPedido, pedidoEnviado };
}
