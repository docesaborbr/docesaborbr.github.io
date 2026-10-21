import type { ImgHTMLAttributes } from "react";
import fotos from "./fotos.json";

type NomeFoto = keyof typeof fotos;

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "sizes"> & {
  nome: NomeFoto;
  alt: string;
  width: number;
  height: number;
};

const conjunto = (nome: NomeFoto, formato: "avif" | "webp") =>
  fotos[nome].larguras.map((largura) => `/images/${nome}-${largura}.${formato} ${largura}w`).join(", ");

/**
 * Foto do site em AVIF ou WebP, na largura certa para a tela (geradas por
 * scripts/otimizar-imagens.mjs). O JPEG original fica para navegador antigo.
 */
export function Foto({ nome, ...img }: Props) {
  const { sizes } = fotos[nome];
  return (
    <picture>
      <source type="image/avif" srcSet={conjunto(nome, "avif")} sizes={sizes} />
      <source type="image/webp" srcSet={conjunto(nome, "webp")} sizes={sizes} />
      <img src={`/images/${nome}.jpg`} decoding="async" {...img} />
    </picture>
  );
}
