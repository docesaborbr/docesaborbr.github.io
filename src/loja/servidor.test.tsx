import { describe, expect, it } from "vitest";
import { renderizar } from "./servidor";

describe("renderizar (HTML gerado no build)", () => {
  const html = renderizar();

  it("traz todas as seções da página, sem depender do JavaScript", () => {
    for (const trecho of ["Bolo de Pote", "Nossos Sabores", "Sobre Nós", "Nós Entregamos", "Peça seu Doce Sabor"]) {
      expect(html).toContain(trecho);
    }
  });

  it("deixa a foto principal com prioridade alta e as outras carregando sob demanda", () => {
    const principal = html.match(/<img[^>]*class="hero-foto"[^>]*>/)?.[0] ?? "";
    expect(principal).toMatch(/fetchPriority="high"/);
    expect(principal).not.toMatch(/loading="lazy"/);

    const galeria = html.match(/<img[^>]*gallery-1\.jpg[^>]*>/)?.[0] ?? "";
    expect(galeria).toMatch(/loading="lazy"/);
    expect(galeria).toMatch(/width="690" height="686"/);
  });

  it("começa com o carrinho vazio, igual ao primeiro render do navegador", () => {
    expect(html).not.toMatch(/nav-cart-count/);
  });
});
