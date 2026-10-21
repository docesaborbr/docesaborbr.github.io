import { useRef, useState } from "react";
import { IconeInstagram, IconeSacola, IconeWhatsApp } from "@/components/icones";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LINK_INSTAGRAM, LINK_WHATSAPP } from "./contato";

type Props = {
  itens: number;
  onAbrirMenu: () => void;
  onAbrirCarrinho: () => void;
};

export function Redes({ className }: { className: string }) {
  return (
    <ul className={className}>
      <li>
        <a href={LINK_INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
          <IconeInstagram />
        </a>
      </li>
      <li>
        <a href={LINK_WHATSAPP} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
          <IconeWhatsApp />
        </a>
      </li>
    </ul>
  );
}

const linkGaveta =
  "rounded-full border border-dourado/55 px-[18px] py-[11px] text-base leading-none transition-colors hover:border-dourado hover:bg-dourado focus-visible:bg-dourado";

export function Navegacao({ itens, onAbrirMenu, onAbrirCarrinho }: Props) {
  const [gavetaAberta, setGavetaAberta] = useState(false);
  // O que o link da gaveta faz só acontece depois que ela fecha: enquanto está
  // aberta a página fica travada (a rolagem não acontece) e o foco ainda é dela
  // (o menu de sabores abriria e perderia o foco de volta para o botão).
  const aoFechar = useRef<(() => void) | null>(null);

  function fecharGavetaE(acao: () => void) {
    aoFechar.current = acao;
    setGavetaAberta(false);
  }

  const rolarAte = (seletor: string) => () =>
    document.querySelector(seletor)?.scrollIntoView({ behavior: "smooth" });

  return (
    <header className="nav">
      <div className="nav-inner">
        <Sheet open={gavetaAberta} onOpenChange={setGavetaAberta}>
          <SheetTrigger asChild>
            <button type="button" className="nav-toggle" aria-label="Abrir menu">
              <span />
              <span />
              <span />
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="gap-0 border-dourado bg-rosa px-5 pt-16 pb-6"
            aria-describedby={undefined}
            onCloseAutoFocus={(evento) => {
              const acao = aoFechar.current;
              if (!acao) return;
              evento.preventDefault();
              aoFechar.current = null;
              acao();
            }}
          >
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <nav className="flex flex-col items-start gap-2">
              <button type="button" className={linkGaveta} onClick={() => fecharGavetaE(onAbrirMenu)}>
                Sabores
              </button>
              <button type="button" className={linkGaveta} onClick={() => fecharGavetaE(rolarAte("#sobre"))}>
                Sobre
              </button>
              <button type="button" className={linkGaveta} onClick={() => fecharGavetaE(rolarAte("#onde"))}>
                Onde estamos
              </button>
              <div className="mt-3 -ml-2">
                <Redes className="nav-social" />
              </div>
            </nav>
          </SheetContent>
        </Sheet>

        <nav className="nav-links">
          <a
            href="#sabores"
            onClick={(evento) => {
              evento.preventDefault();
              onAbrirMenu();
            }}
          >
            Sabores
          </a>
          <a href="#sobre">Sobre</a>
          <a href="#onde">Onde estamos</a>
          <Redes className="nav-social" />
        </nav>

        <a href="#" className="nav-logo">
          Doce Sabor
        </a>

        <Button
          variant="ghost"
          className="nav-cart hover:bg-transparent"
          aria-label={itens ? `Abrir carrinho, ${itens} ${itens === 1 ? "item" : "itens"}` : "Abrir carrinho"}
          onClick={onAbrirCarrinho}
        >
          <IconeSacola className="size-6" />
          <span>Carrinho</span>
          {itens > 0 && <Badge className="nav-cart-count">{itens}</Badge>}
        </Button>
      </div>
    </header>
  );
}
