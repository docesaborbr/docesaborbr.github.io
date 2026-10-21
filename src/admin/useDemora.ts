import { useEffect, useState } from "react";

/**
 * Fica true quando algo segue em andamento por mais que `ms`. O servidor grátis
 * do Render dorme e leva até um minuto para acordar: depois de alguns segundos
 * esperando, a tela avisa em vez de parecer travada.
 */
export function useDemora(emAndamento: boolean, ms = 3000): boolean {
  const [demorando, setDemorando] = useState(false);

  useEffect(() => {
    if (!emAndamento) {
      setDemorando(false);
      return;
    }
    const relogio = setTimeout(() => setDemorando(true), ms);
    return () => clearTimeout(relogio);
  }, [emAndamento, ms]);

  return demorando;
}
