export const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
/** O mesmo limite do servidor (backend/routes/produtos.js). */
export const TAMANHO_MAXIMO = 5 * 1024 * 1024;
/** O servidor recorta a foto em 600x600; o dobro deixa margem para o recorte. */
const LADO_MAXIMO = 1200;
/** Abaixo disso a foto já vai leve e não vale reprocessar. */
const LEVE_O_BASTANTE = 400 * 1024;

/** Recusa no navegador o que o servidor recusaria, antes de gastar o envio. */
export function problemaNaFoto(arquivo: { type: string }): string | null {
  return TIPOS_ACEITOS.includes(arquivo.type) ? null : "Use uma foto em JPG, PNG ou WebP.";
}

/** Tamanho final mantendo a proporção, com o maior lado limitado. */
export function dimensoesReduzidas(largura: number, altura: number, ladoMaximo = LADO_MAXIMO) {
  const escala = Math.min(1, ladoMaximo / Math.max(largura, altura));
  return { largura: Math.round(largura * escala), altura: Math.round(altura * escala) };
}

/**
 * Reduz a foto antes do envio: uma foto de celular de 4 MB vira poucas centenas
 * de KB, o que sobe rápido no 4G e não esbarra no limite de 5 MB. Se o navegador
 * não conseguir processar, manda a original — o servidor valida de novo.
 */
export async function reduzirFoto(arquivo: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(arquivo); // já respeita a orientação da câmera
    const { largura, altura } = dimensoesReduzidas(bitmap.width, bitmap.height);
    if (largura === bitmap.width && arquivo.size <= LEVE_O_BASTANTE) {
      bitmap.close();
      return arquivo;
    }

    const tela = document.createElement("canvas");
    tela.width = largura;
    tela.height = altura;
    const contexto = tela.getContext("2d");
    if (!contexto) return arquivo;
    // JPEG não tem transparência: sem um fundo, o que era transparente viraria preto
    contexto.fillStyle = "#FFFFFF";
    contexto.fillRect(0, 0, largura, altura);
    contexto.drawImage(bitmap, 0, 0, largura, altura);
    bitmap.close();

    const blob = await new Promise<Blob | null>((ok) => tela.toBlob(ok, "image/jpeg", 0.88));
    if (!blob || blob.size >= arquivo.size) return arquivo;
    return new File([blob], arquivo.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return arquivo;
  }
}
