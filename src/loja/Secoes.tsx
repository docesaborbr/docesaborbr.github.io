import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CIDADE_LOJA, ENDERECO_LOJA, HORARIO_LOJA } from "./contato";
import { Foto } from "./Foto";

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
      {/* é a maior imagem da primeira tela (o LCP): sem lazy e com prioridade alta */}
      <Foto nome="hero-capa" className="hero-foto" alt="" width={2690} height={1307} fetchPriority="high" />
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
      <Foto
        nome="bolos-de-pote"
        className="flavors-cups"
        loading="lazy"
        width={1721}
        height={914}
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
        <Foto
          nome="doce-pote"
          loading="lazy"
          width={1308}
          height={1202}
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
        <Foto nome="confeiteira" className="about-avatar" loading="lazy" alt="Foto da confeiteira" width={400} height={400} />
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
        <Foto nome="creme-de-chocolate" loading="lazy" width={1308} height={1203} alt="Calda de chocolate com raspas" />
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
            {CIDADE_LOJA}
          </p>
        </div>
        <div className="delivery-bloco">
          <h3>Quando abrimos</h3>
          <p>
            Todos os dias
            <br />
            {HORARIO_LOJA}
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
      <Foto nome="gallery-1" loading="lazy" width={690} height={686} alt="Bolo de pote com rótulo Doce Sabor segurado na mão" />
      <Foto nome="gallery-2" loading="lazy" width={690} height={686} alt="Bolo de pote de chocolate com morangos e raspas, visto de perto" />
      <Foto nome="gallery-3" loading="lazy" width={690} height={686} alt="Bolos de pote de morango com creme e de cookies, vistos de cima" />
      <Foto nome="gallery-4" loading="lazy" width={690} height={686} alt="Bolos de pote de doce de leite com brigadeiro e de maracujá, vistos de cima" />
    </section>
  );
}
