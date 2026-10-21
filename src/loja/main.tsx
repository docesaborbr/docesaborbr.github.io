import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "@/index.css";
import "./secoes.css";
import { App } from "./App";

const raiz = document.getElementById("raiz")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// No site publicado o HTML já vem renderizado do build; no `npm run dev`, não.
if (raiz.hasChildNodes()) hydrateRoot(raiz, app);
else createRoot(raiz).render(app);
