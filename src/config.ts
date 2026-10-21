/**
 * Endereço da API, o mesmo para a loja e o painel. Para testar com a API local,
 * crie um .env.local com VITE_API_URL=http://localhost:3000.
 */
export const API: string = import.meta.env.VITE_API_URL || "https://doce-sabor-api.onrender.com";
