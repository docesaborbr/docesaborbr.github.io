/** Mostrado quando a API demora: no plano grátis do Render ela dorme e leva até um minuto para voltar. */
export function AvisoServidorAcordando() {
  return (
    <p role="status" className="text-sm leading-snug opacity-80">
      Conectando ao servidor… Na primeira vez depois de um tempo parado ele pode levar até um minuto para acordar.
    </p>
  );
}
