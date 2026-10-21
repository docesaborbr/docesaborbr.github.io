import { useState } from "react";
import { totalItens } from "./carrinho";
import { CarrinhoDialog } from "./CarrinhoDialog";
import { MenuDialog } from "./MenuDialog";
import { Navegacao } from "./Navegacao";
import { Rodape } from "./Rodape";
import { Entregamos, Galeria, Hero, MelhorBolo, Sabores, SobreNos } from "./Secoes";
import { useLoja } from "./useLoja";

type Janela = "menu" | "carrinho" | null;

export function App() {
  const loja = useLoja();
  const [janela, setJanela] = useState<Janela>(null);

  const abrirMenu = () => setJanela("menu");
  const abrirCarrinho = () => setJanela("carrinho");
  const fecharSe = (aberta: boolean) => {
    if (!aberta) setJanela(null);
  };

  return (
    <>
      <Navegacao itens={totalItens(loja.carrinho)} onAbrirMenu={abrirMenu} onAbrirCarrinho={abrirCarrinho} />

      <main>
        <Hero />
        <Sabores onAbrirMenu={abrirMenu} />
        <MelhorBolo onAbrirMenu={abrirMenu} />
        <SobreNos />
        <Entregamos onAbrirMenu={abrirMenu} />
        <Galeria />
      </main>

      <Rodape />

      <MenuDialog
        aberto={janela === "menu"}
        onOpenChange={fecharSe}
        produtos={loja.produtos}
        carrinho={loja.carrinho}
        onMudar={loja.mudar}
        onIrCarrinho={abrirCarrinho}
      />
      <CarrinhoDialog
        aberto={janela === "carrinho"}
        onOpenChange={fecharSe}
        produtos={loja.produtos}
        carrinho={loja.carrinho}
        pedidoEnviado={loja.pedidoEnviado}
        onMudar={loja.mudar}
        onEsvaziar={loja.esvaziar}
        onPedidoEnviado={loja.concluirPedido}
        onEscolherMais={abrirMenu}
      />
    </>
  );
}
