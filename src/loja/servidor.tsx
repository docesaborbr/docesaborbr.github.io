import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { App } from "./App";

/**
 * HTML da loja gerado no build (scripts/prerenderizar.mjs). Assim a página chega
 * pronta: aparece antes do JavaScript, o buscador lê o conteúdo e o navegador já
 * encontra a foto principal no HTML. No navegador, o React assume (hydrateRoot).
 */
export function renderizar(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
