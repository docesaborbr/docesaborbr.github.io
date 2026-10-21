import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ENDERECO_LOJA } from "./contato";

type AbreMenu = { onAbrirMenu: () => void };

function BotaoPedido({ onAbrirMenu, variant = "default" }: AbreMenu & { variant?: "default" | "claro" }) {
  return (
    <Button variant={variant} className="secao-btn" onClick={onAbrirMenu}>
      Faça seu pedido
      <br />
      pelo WhatsApp
    </Button>
  );
}

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-inner">
        <h1 className="hero-title">Bolo de Pote</h1>
        <p className="hero-tag">Feito artesanalmente</p>
        <Button asChild className="hero-btn">
          <a href="#sabores">Nossos sabores</a>
        </Button>
      </div>
    </section>
  );
}

export function Sabores({ onAbrirMenu }: AbreMenu) {
  return (
    <section className="flavors" id="sabores">
      <p className="eyebrow">Fresco e saboroso!</p>
      <h2 className="display">Nossos Sabores</h2>
      <img
        className="flavors-cups"
        loading="lazy"
        src="/images/bolos-de-pote.jpg"
        alt="Cinco bolos de pote vistos de cima: chocolate com wafer, morango com creme, cookies com chocolate, doce de leite com brigadeiro e maracujá com chocolate branco"
      />
      <Button size="lg" className="flavors-btn" onClick={onAbrirMenu}>
        Escolher meus sabores
      </Button>
    </section>
  );
}

export function MelhorBolo({ onAbrirMenu }: AbreMenu) {
  return (
    <section className="split split-lactose">
      <div className="split-text">
        <p className="eyebrow">Aproveite</p>
        <h2 className="display">O Melhor Bolo de Pote</h2>
        <BotaoPedido onAbrirMenu={onAbrirMenu} />
      </div>
      <div className="split-photo">
        <img
          src="/images/doce-pote.jpg"
          alt="Mão segurando um bolo de pote Doce Sabor de chocolate, com granulado e morango por cima"
        />
      </div>
    </section>
  );
}

export function SobreNos() {
  const [aberto, setAberto] = useState(false);

  return (
    <section className={cn("split split-about", aberto && "aberto")} id="sobre">
      <div className="split-text">
        <p className="eyebrow">Nossa História</p>
        <h2 className="display">Sobre Nós</h2>
        <img className="about-avatar" src="/images/confeiteira.jpg" alt="Foto da confeiteira" width={400} height={400} />
        <div className="about-text">
          <p>
            Natural de São Bento do Sul, aos 44 anos, ela reúne 15 anos de experiência na área de confeitaria e
            gastronomia, transformando dedicação e paixão pela culinária em doces e experiências especiais.
          </p>
          <div className="about-mais" id="sobreMais" hidden={!aberto}>
            <p>
              Sua formação inclui Técnico em Confeitaria e Cake Design, além de estudos em Gastronomia Nacional e
              Internacional e Curso Básico de Confeitaria.
            </p>
            <p>
              Ao longo de sua trajetória, também participou do Congresso de Confeitaria do Japão, onde foi destaque e
              conquistou a vitória na competição, levando seu talento e dedicação ainda mais longe.
            </p>
            <p>
              Hoje, cada criação carrega a experiência adquirida ao longo desses anos, unindo técnica, criatividade e
              paixão pela confeitaria para oferecer produtos feitos com cuidado e atenção a cada detalhe.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="secao-btn"
          aria-expanded={aberto}
          aria-controls="sobreMais"
          onClick={() => setAberto((a) => !a)}
        >
          {aberto ? "Leia menos" : "Leia mais"}
        </Button>
      </div>
      <div className="split-photo">
        <img src="/images/creme-de-chocolate.jpg" alt="Calda de chocolate com raspas" />
      </div>
    </section>
  );
}

export function Entregamos({ onAbrirMenu }: AbreMenu) {
  return (
    <section className="delivery" id="onde">
      <p className="eyebrow eyebrow-light">Retirada e entrega</p>
      <h2 className="display display-light">Nós Entregamos</h2>

      <div className="delivery-info">
        <div className="delivery-bloco">
          <h3>Onde estamos</h3>
          <p>
            {ENDERECO_LOJA}
            <br />
            Joinville, SC · 89201-000
          </p>
        </div>
        <div className="delivery-bloco">
          <h3>Quando abrimos</h3>
          <p>
            Todos os dias
            <br />
            das 10h às 22h
          </p>
        </div>
        <div className="delivery-bloco">
          <h3>Como receber</h3>
          <p>
            Retirada no local ou
            <br />
            consulte a entrega
          </p>
        </div>
      </div>

      <BotaoPedido onAbrirMenu={onAbrirMenu} variant="claro" />
    </section>
  );
}

export function Galeria() {
  return (
    <section className="gallery">
      <img loading="lazy" src="/images/gallery-1.jpg" alt="Bolo de pote com rótulo Doce Sabor segurado na mão" />
      <img loading="lazy" src="/images/gallery-2.jpg" alt="Bolo de pote de chocolate com morangos e raspas, visto de perto" />
      <img loading="lazy" src="/images/gallery-3.jpg" alt="Bolos de pote de morango com creme e de cookies, vistos de cima" />
      <img loading="lazy" src="/images/gallery-4.jpg" alt="Bolos de pote de doce de leite com brigadeiro e de maracujá, vistos de cima" />
    </section>
  );
}
