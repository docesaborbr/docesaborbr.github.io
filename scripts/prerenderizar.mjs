/**
 * Última etapa do `npm run build`: coloca o HTML da loja, renderizado pelo React,
 * dentro do dist/index.html. Depende das duas passadas anteriores do Vite (a do
 * navegador, em dist/, e a de servidor, em dist-ssr/).
 */
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pagina = path.join(raiz, "dist", "index.html");
const servidor = path.join(raiz, "dist-ssr", "servidor.js");

const { renderizar } = await import(pathToFileURL(servidor).href);
const html = await readFile(pagina, "utf8");

const vazio = '<div id="raiz"></div>';
if (!html.includes(vazio)) throw new Error(`dist/index.html não tem ${vazio}`);

await writeFile(pagina, html.replace(vazio, `<div id="raiz">${renderizar()}</div>`));
await rm(path.join(raiz, "dist-ssr"), { recursive: true, force: true });
console.log("dist/index.html pré-renderizado");
