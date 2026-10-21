/**
 * Dados da loja num lugar só: daqui saem o rodapé, a seção "Nós Entregamos", a
 * opção de retirada do carrinho, a mensagem do pedido e os dados estruturados que
 * o Google lê (dadosEstruturados, injetado no <head> pelo build).
 */
export const LOJA = {
  nome: "Doce Sabor",
  site: "https://docesaborbr.github.io/",
  whatsapp: "5547997417610", // 55 + DDD + número, sem espaço ou traço
  instagram: "https://www.instagram.com/",
  endereco: { rua: "Rua do Príncipe, 500", bairro: "Centro", cidade: "Joinville", estado: "SC", cep: "89201-000" },
  horario: { abre: 10, fecha: 22 }, // todos os dias
  pagamentos: ["Pix", "Cartão", "Dinheiro"],
} as const;

export const WHATSAPP = LOJA.whatsapp;
export const LINK_WHATSAPP = "https://wa.me/" + WHATSAPP;
export const LINK_INSTAGRAM = LOJA.instagram;
export const ENDERECO_LOJA = `${LOJA.endereco.rua} — ${LOJA.endereco.bairro}`;
export const CIDADE_LOJA = `${LOJA.endereco.cidade}, ${LOJA.endereco.estado} · ${LOJA.endereco.cep}`;
export const HORARIO_LOJA = `das ${LOJA.horario.abre}h às ${LOJA.horario.fecha}h`;

/** "5547997417610" -> "(47) 99741-7610" */
export function telefoneParaLer(numero: string): string {
  const local = numero.slice(4);
  return `(${numero.slice(2, 4)}) ${local.slice(0, -4)}-${local.slice(-4)}`;
}

const hora = (h: number) => String(h).padStart(2, "0") + ":00";

/** Bloco schema.org do tipo Bakery: endereço, horário e contato para a busca e o Maps. */
export function dadosEstruturados() {
  const { endereco, horario } = LOJA;
  return {
    "@context": "https://schema.org",
    "@type": "Bakery",
    name: LOJA.nome,
    description: "Bolo de pote artesanal em Joinville. Escolha os sabores, monte seu pedido e finalize pelo WhatsApp.",
    url: LOJA.site,
    image: LOJA.site + "images/preview.jpg",
    telephone: `+${LOJA.whatsapp.slice(0, 2)} ${telefoneParaLer(LOJA.whatsapp).replace(/[()]/g, "")}`,
    priceRange: "$",
    servesCuisine: "Confeitaria",
    paymentAccepted: LOJA.pagamentos.join(", "),
    currenciesAccepted: "BRL",
    hasMenu: LOJA.site + "#sabores",
    areaServed: { "@type": "City", name: endereco.cidade },
    address: {
      "@type": "PostalAddress",
      streetAddress: endereco.rua,
      addressLocality: endereco.cidade,
      addressRegion: endereco.estado,
      postalCode: endereco.cep,
      addressCountry: "BR",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: hora(horario.abre),
        closes: hora(horario.fecha),
      },
    ],
  };
}
