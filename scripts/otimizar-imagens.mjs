/**
 * Gera as versões AVIF e WebP das fotos do site, nas larguras de src/loja/fotos.json
 * (o mesmo arquivo de onde o componente Foto tira o srcset e o sizes).
 *
 *   node scripts/otimizar-imagens.mjs
 *
 * Rode depois de trocar ou acrescentar uma foto em public/images (o JPEG original
 * fica como está: é o que navegadores antigos e as prévias de link usam). As
 * larguras seguem o tamanho em que cada foto aparece na página, em telas comuns e
 * de alta densidade; o navegador escolhe a menor que dá conta.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pasta = path.join(raiz, "public", "images");
const fotos = JSON.parse(await readFile(path.join(raiz, "src", "loja", "fotos.json"), "utf8"));

const kib = (bytes) => (bytes / 1024).toFixed(1).padStart(6) + " KiB";

for (const [nome, { larguras }] of Object.entries(fotos)) {
  const original = path.join(pasta, nome + ".jpg");
  const { width } = await sharp(original).metadata();

  for (const largura of larguras) {
    if (largura > width) throw new Error(`${nome}: ${largura}px é maior que o original (${width}px)`);
    const redimensionada = sharp(original).resize({ width: largura });
    const avif = path.join(pasta, `${nome}-${largura}.avif`);
    const webp = path.join(pasta, `${nome}-${largura}.webp`);
    await redimensionada.clone().avif({ quality: 55, effort: 6 }).toFile(avif);
    await redimensionada.clone().webp({ quality: 78, effort: 6 }).toFile(webp);
    console.log(
      `${nome}-${largura}`.padEnd(28),
      "avif", kib((await stat(avif)).size),
      " webp", kib((await stat(webp)).size),
    );
  }
}
