import { describe, expect, it } from "vitest";
import { dimensoesReduzidas, problemaNaFoto } from "./foto";

describe("problemaNaFoto", () => {
  it("aceita JPG, PNG e WebP", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) expect(problemaNaFoto({ type })).toBeNull();
  });

  it("recusa outros formatos, inclusive HEIC do iPhone e arquivo sem tipo", () => {
    for (const type of ["image/heic", "image/gif", "application/pdf", ""]) {
      expect(problemaNaFoto({ type })).toBe("Use uma foto em JPG, PNG ou WebP.");
    }
  });
});

describe("dimensoesReduzidas", () => {
  it("reduz pelo maior lado mantendo a proporção", () => {
    expect(dimensoesReduzidas(4000, 3000)).toEqual({ largura: 1200, altura: 900 });
    expect(dimensoesReduzidas(3000, 4000)).toEqual({ largura: 900, altura: 1200 });
  });

  it("não aumenta foto que já é pequena", () => {
    expect(dimensoesReduzidas(800, 600)).toEqual({ largura: 800, altura: 600 });
  });
});
