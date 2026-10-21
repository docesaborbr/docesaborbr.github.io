import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { loadEnv, type HtmlTagDescriptor, type Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { API_PADRAO } from "./src/api-padrao";
import { dadosEstruturados } from "./src/loja/contato";

/**
 * Política de segurança das páginas publicadas: só roda script do próprio site e
 * só conversa com a API. É o que impede um script injetado de levar o token do
 * painel para outro lugar. O GitHub Pages não deixa configurar cabeçalhos, então
 * vai como <meta>. Fica fora do `npm run dev`, que injeta script inline.
 */
function politicaDeSeguranca(api: string, pagina: "loja" | "admin"): string {
  const origemApi = new URL(api).origin;
  return [
    "default-src 'self'",
    "script-src 'self'",
    // os componentes (Radix, Sonner) põem estilo inline
    "style-src 'self' 'unsafe-inline'",
    // blob: é a prévia da foto escolhida no painel
    `img-src 'self' ${origemApi}${pagina === "admin" ? " blob:" : ""}`,
    "font-src 'self'",
    `connect-src 'self' ${origemApi}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

function paginasDaLoja(api: string): Plugin {
  return {
    name: "paginas-da-loja",
    transformIndexHtml(_html, contexto) {
      const pagina = contexto.filename.endsWith("admin.html") ? "admin" : "loja";
      const tags: HtmlTagDescriptor[] = [];
      if (!contexto.server) {
        tags.push({
          tag: "meta",
          attrs: { "http-equiv": "Content-Security-Policy", content: politicaDeSeguranca(api, pagina) },
          injectTo: "head-prepend",
        });
      }
      if (pagina === "loja") {
        tags.push({
          tag: "script",
          attrs: { type: "application/ld+json" },
          // "<" escapado: um texto com "</script>" não fecha o bloco antes da hora
          children: JSON.stringify(dadosEstruturados()).replace(/</g, "\\u003c"),
          injectTo: "head",
        });
      }
      return tags;
    },
  };
}

export default defineConfig(({ mode, isSsrBuild }) => {
  const api = loadEnv(mode, import.meta.dirname, "VITE_").VITE_API_URL || API_PADRAO;
  return {
    plugins: [react(), tailwindcss(), paginasDaLoja(api)],
    resolve: {
      alias: { "@": path.resolve(import.meta.dirname, "src") },
    },
    // A API local já libera http://localhost:8000 por padrão (ORIGENS_PERMITIDAS).
    server: { port: 8000, strictPort: true },
    build: isSsrBuild
      ? // segunda passada do build: a loja renderizada em Node, só para gerar o HTML
        // (scripts/prerenderizar.mjs). Leva as dependências junto para rodar sozinha.
        { outDir: "dist-ssr", emptyOutDir: true }
      : {
          rollupOptions: {
            input: {
              loja: path.resolve(import.meta.dirname, "index.html"),
              admin: path.resolve(import.meta.dirname, "admin.html"),
            },
          },
        },
    ssr: { noExternal: true },
    // o backend tem a própria suíte (node --test), rodada de dentro de backend/
    test: { environment: "node", include: ["src/**/*.test.ts", "src/**/*.test.tsx"] },
  };
});
