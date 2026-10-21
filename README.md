# Doce Sabor

Site de uma loja de bolo de pote em Joinville (SC). O cliente escolhe os sabores,
monta o carrinho e o pedido chega pronto no WhatsApp da loja.

**No ar:** https://docesaborbr.github.io

---

## Como abrir

O front-end é React + TypeScript, montado pelo Vite, com Tailwind e componentes do
[shadcn/ui](https://ui.shadcn.com). Precisa do Node 20 ou mais novo:

```bash
npm install
npm run dev        # loja em http://localhost:8000, painel em /admin.html
```

Outros comandos:

```bash
npm test           # testes do carrinho, do pedido, das fotos e da página gerada (Vitest)
npm run build      # confere os tipos, gera o site em dist/ e pré-renderiza a loja
npm run preview    # serve o dist/ para conferir o build
node scripts/otimizar-imagens.mjs   # depois de trocar uma foto (veja "Fotos do site")
```

## Arquivos

```
├── index.html             → a loja (o conteúdo vem de src/loja e é pré-renderizado no build)
├── admin.html             → painel da dona da loja (login + produtos)
├── src/
│   ├── index.css          → tema: cores da marca, fontes e tokens do shadcn
│   ├── config.ts          → endereço da API (vale para a loja e o painel)
│   ├── components/ui/     → componentes do shadcn/ui (código nosso, pode editar)
│   ├── lib/               → formatação de preço e validação do que vem da API
│   ├── loja/              → seções da página, menu, carrinho e regras do pedido
│   │   ├── contato.ts     → dados da loja: WhatsApp, endereço, horário, pagamento
│   │   ├── catalogo.ts    → lista de reserva e leitura do catálogo da API
│   │   ├── carrinho.ts    → regras do carrinho e texto do WhatsApp (com testes)
│   │   ├── Foto.tsx       → fotos em AVIF/WebP no tamanho certo (fotos.json)
│   │   ├── servidor.tsx   → gera o HTML da loja no build
│   │   └── secoes.css     → layout das seções, ajustado em px/vw à mão
│   └── admin/             → login, lista, formulário, ordem, esgotado e destaque
├── public/                → copiado como está: favicon, fotos, fontes, robots e sitemap
├── scripts/               → otimizar as fotos e pré-renderizar a loja
├── .github/workflows/     → publicação no GitHub Pages e o "manter API acordada"
├── components.json        → configuração do shadcn/ui
├── render.yaml            → configuração do deploy da API no Render
└── backend/               → a API (Node + Express + PostgreSQL)
    ├── server.js         rotas, CORS, limites, tratamento de erro
    ├── db.js             conexão com o Postgres e transações
    ├── auth.js           bcrypt, JWT e o middleware que barra quem não é admin
    ├── routes/produtos.js CRUD, esgotado, destaque, ordem e tratamento da imagem
    ├── schema.sql        tabelas (roda em toda subida; seguro sobre dados existentes)
    ├── scripts/          criar-admin e o Postgres de desenvolvimento
    └── tests/            testes de integração
```

A página tem estas seções, nesta ordem: navegação, hero, Nossos Sabores,
O Melhor Bolo de Pote, Sobre Nós, Nós Entregamos (endereço, horário e forma de
retirada), galeria e rodapé.

O endereço aparece **num lugar só** na página, na faixa marrom "Nós Entregamos",
alcançável pelo link "Onde estamos" do menu. Repetir esse dado em vários cantos cria
trabalho de manutenção e faz o cliente duvidar de qual está certo quando um deles
ficar desatualizado.

---

## Painel da loja

Em `/admin.html`, depois do login, cada sabor tem:

- **Setas ↑ ↓** — mudam a ordem em que os sabores aparecem no cardápio.
- **Esgotado hoje** — o sabor continua no cardápio, apagado e sem o botão de
  adicionar. **No dia seguinte ele volta sozinho**, sem precisar desmarcar. Quem já
  tinha esse sabor num carrinho salvo vê um aviso e ele fica fora do pedido.
- **Sabor da semana** — o sabor abre o menu com um selo dourado. Só um por vez:
  marcar outro tira o destaque do anterior.
- **Editar** e **Excluir**.

A foto escolhida é reduzida no próprio celular antes do envio (JPG, PNG ou WebP);
o servidor ainda a recorta em 600×600.

---

## Rodando com o back-end

**Em produção está tudo na nuvem:** a loja e o painel no GitHub Pages, a API no
Render e o banco no Neon. O `src/config.ts` aponta para a API publicada.

Para mexer no back-end na sua máquina (opcional), suba um banco e a API:

```bash
cd backend && npm install
npm run db:dev     # Postgres local, sem instalar nada
npm start          # a API em localhost:3000
```

Nesse caso, crie na raiz um `.env.local` com `VITE_API_URL=http://localhost:3000`
(ele não vai para o Git) e rode `npm run dev`. O Vite sobe em `http://localhost:8000`,
que já é a origem que a API libera quando `ORIGENS_PERMITIDAS` não está definida.

A API lê do `backend/.env`: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL` e
`ADMIN_SENHA` (e, se preciso, `ORIGENS_PERMITIDAS`). **Esse arquivo nunca vai para
o Git** — está no `.gitignore`.

### Esqueceu a senha do painel?

A variável `ADMIN_SENHA` no Render é a fonte da verdade. Para redefinir: troque o
valor dela no painel do Render (serviço → **Environment**) e salve — o Render
reimplanta sozinho e a senha nova passa a valer em um ou dois minutos. A antiga
para de funcionar na hora.

Isso existe porque o plano gratuito do Render não dá acesso a terminal: sem esse
caminho, uma senha perdida trancaria vocês para fora do próprio painel.

Localmente, o mesmo se faz por comando:

```bash
cd backend && npm run criar-admin dona@docesabor.com.br "uma senha forte"
```

Os testes sobem um Postgres de verdade e exercitam login, autorização, upload,
esgotado, destaque, ordem e a migração do banco:

```bash
cd backend && npm test
```

### Publicando a API no Render

O `render.yaml` já descreve o serviço. No painel do Render: **New → Blueprint**,
aponte para este repositório e preencha as variáveis marcadas como `sync: false`
(`DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_SENHA`). O `JWT_SECRET` o Render gera sozinho.

A URL do serviço fica em `src/api-padrao.ts`. O banco é o Neon; a `DATABASE_URL` é
colada no painel do Render e nunca entra no repositório. **As fotos dos produtos
ficam no banco**, não no disco do Render (que é apagado a cada deploy) — nada se
perde quando o servidor reinicia.

> **O servidor grátis dorme** após 15 minutos parado, e a primeira requisição
> seguinte leva até um minuto. Três coisas cuidam disso:
>
> - O workflow `.github/workflows/manter-api-acordada.yml` chama a API a cada 10
>   minutos das 9h às 22h (horário de Brasília) — cerca de 400 h por mês, dentro
>   das 750 h grátis do Render. O GitHub pausa agendamentos depois de 60 dias sem
>   commit no repositório; para reativar: aba **Actions → Manter API acordada →
>   Enable workflow**. Em horário de pico o agendamento pode atrasar uns minutos.
> - A loja abre com uma lista de sabores de reserva (em `src/loja/catalogo.ts`) e
>   troca pelos dados reais quando a API responde — **a loja nunca aparece vazia**.
>   O que o cliente já pôs no carrinho passa para o sabor de mesmo nome.
> - O painel acorda o servidor assim que abre e avisa "Conectando ao servidor…"
>   quando ele demora.

> Se a conexão com o banco falhar com erro de certificado, o provedor usa uma CA
> própria: coloque o certificado na variável `DATABASE_CA_CERT`. Não desative a
> validação — ela é o que impede alguém no caminho de ler a senha do banco.

---

## Como o pedido funciona

O catálogo vem da API; o carrinho e o fechamento acontecem no navegador:

1. O cliente clica em **Escolher meus sabores** (ou em qualquer botão "Faça seu
   pedido pelo WhatsApp") e vê os sabores, com o sabor da semana primeiro.
2. Cada **Adicionar** soma uma unidade. O contador dourado na barra de navegação
   acompanha. Sabor esgotado hoje não pode ser adicionado.
3. Em **Ir para o carrinho** ele revisa itens, quantidades e total.
4. **Finalizar compra** pergunta como ele quer receber:
   - **Retirar na loja** manda o pedido na hora, com o endereço da loja na mensagem.
   - **Receber em casa** abre o campo de endereço, que aí é obrigatório.
5. O WhatsApp abre com a mensagem já escrita:

```
Olá! Quero fazer um pedido no Doce Sabor:

• Bolo de pote sabor Morango com creme — 1 un — R$ 15,00
• Bolo de pote sabor Chocolate com wafer — 2 un — R$ 32,00

Total: R$ 47,00

Entrega em: Rua das Palmeiras, 320, apto 12 — Bucarein
```

> **Atenção, para quem atende os pedidos:** o preço e a quantidade são calculados no
> navegador do cliente, e qualquer pessoa com o console aberto consegue alterá-los
> antes de enviar. **O total que chega no WhatsApp é uma proposta, não um valor
> confiável.** Sempre confira os itens e refaça a conta antes de confirmar o pedido.
> Só um site com servidor resolveria isso de verdade.

---

## O que você provavelmente vai querer mudar

### Dados da loja: WhatsApp, endereço, horário, pagamento

Tudo num objeto só, `LOJA`, em `src/loja/contato.ts`:

```ts
export const LOJA = {
  nome: "Doce Sabor",
  site: "https://docesaborbr.github.io/",
  whatsapp: "5547997417610", // 55 + DDD + número, sem espaço ou traço
  instagram: "https://www.instagram.com/",
  endereco: { rua: "Rua do Príncipe, 500", bairro: "Centro", cidade: "Joinville", estado: "SC", cep: "89201-000" },
  horario: { abre: 10, fecha: 22 }, // todos os dias
  pagamentos: ["Pix", "Cartão", "Dinheiro"],
};
```

Daqui saem o rodapé, a seção "Nós Entregamos", os ícones de WhatsApp, a opção
"Retirar na loja" do carrinho, a mensagem do pedido e os dados que o Google lê
(veja "Google"). Trocou aqui, trocou em todo lugar.

### Sabores e preços

**Com o back-end no ar, isso se faz pelo painel** (`/admin.html`), sem tocar em
código — veja "Painel da loja".

A lista abaixo, em `src/loja/catalogo.ts`, é só a **reserva** usada enquanto a API
não responde:

```ts
export const RESERVA: Produto[] = [
  { id: "morango-creme", nome: "Morango com creme", preco: 15, img: "/images/menu-morango-creme-440.webp", esgotado: false, destaque: false },
  ...
];
```

Vale mantê-la com os **mesmos nomes** do catálogo real: é pelo nome que o carrinho
montado nos primeiros segundos passa para o produto de verdade.

### Fotos do site

As fotos ficam em `public/images` (o JPEG original). Para cada uma, o site usa
versões AVIF e WebP em algumas larguras, listadas em `src/loja/fotos.json` — o
navegador baixa só a menor que dá conta da tela. Depois de trocar ou acrescentar uma
foto (mesmo nome de arquivo), rode:

```bash
node scripts/otimizar-imagens.mjs
```

A foto do fundo de "Nossos Sabores" (`flavors-potes`) é referenciada direto em
`src/loja/secoes.css`. A `preview.jpg` é a imagem que aparece quando o link é
compartilhado no WhatsApp.

### Cores

Todas as cores estão em `src/index.css`, em variáveis:

```css
:root {
    --marrom: #541F03;   /* texto e fundos escuros */
    --rosa: #F9CFD9;     /* navegação, rodapé, modais e seções claras */
    --dourado: #C9A227;  /* molduras dos botões e detalhes */
}
```

Trocar o valor ali muda a cor na loja e no painel de uma vez. Os tokens do shadcn
(`--primary`, `--accent`, `--border`...) logo abaixo apontam para essas cores, então
os componentes acompanham.

---

## Google

O site já entrega ao Google o que dá para fazer pelo código:

- **Dados estruturados** do tipo `Bakery` (endereço, horário, telefone, pagamento),
  gerados no build a partir de `LOJA` e colocados no `<head>`. Para conferir:
  [Rich Results Test](https://search.google.com/test/rich-results).
- **`robots.txt`**, **`sitemap.xml`** e **link canônico**.
- **HTML pronto**: a loja é pré-renderizada no build, então o conteúdo está no HTML
  mesmo sem rodar o JavaScript.

O que depende de vocês (todos grátis, com a conta Google da loja):

- **Perfil da Empresa no Google** (business.google.com) — é o que faz a loja aparecer
  no Maps e em buscas como "bolo de pote Joinville".
- **Google Search Console** — cadastrar o site e enviar
  `https://docesaborbr.github.io/sitemap.xml`. Para verificar a propriedade pelo
  método "tag HTML", me passem a tag e ela entra no `index.html`.
- **Métricas sem banner de cookies** — Cloudflare Web Analytics ou GoatCounter.
  Criada a conta, o código entra no site (e na política de segurança, abaixo).

### Domínio próprio

O GitHub Pages aceita domínio próprio com HTTPS grátis. Ao registrar um (ex.: no
Registro.br): configure o DNS conforme a documentação do GitHub Pages, crie
`public/CNAME` com o domínio e troque `docesaborbr.github.io` por ele em `LOJA.site`,
no `index.html` (link canônico e tags `og:`), em `public/robots.txt`,
`public/sitemap.xml` e em `ORIGENS_PERMITIDAS` no Render.

---

## Publicação

**Todo push para `main` atualiza o site no ar** em um ou dois minutos — não existe
passo de deploy manual. O workflow `.github/workflows/publicar-site.yml` instala as
dependências, roda os testes, gera o `dist/` e publica no GitHub Pages. Se um teste
falhar, o site no ar continua como estava.

> **Configuração única:** em **Settings → Pages → Build and deployment**, a origem
> (*Source*) precisa ser **GitHub Actions**. Com a origem antiga (*Deploy from a
> branch*), o Pages publicaria o código-fonte cru e a página ficaria em branco.

O GitHub Pages manda o navegador guardar os arquivos por 10 minutos. O build já
resolve isso: os nomes dos arquivos em `dist/assets/` levam um resumo do conteúdo,
então qualquer mudança gera um nome novo e o navegador é obrigado a buscá-lo.

O repositório se chama `docesaborbr.github.io` de propósito: é esse nome que faz o
GitHub servir o site em `docesaborbr.github.io` sem `/nome-do-repo/` no final.
Renomear o repositório quebra a URL.

Para medir a velocidade, use o [PageSpeed Insights](https://pagespeed.web.dev/) com
o endereço do site.

---

## Responsivo

- **≥ 1350px** — medidas fixas em pixels.
- **860px – 1349px** — o mesmo desenho encolhe proporcionalmente (medidas em `vw`).
  Até 1100px os ícones do Instagram e do WhatsApp saem do topo (continuam no rodapé),
  senão passariam por cima do logo.
- **≤ 860px** — as colunas empilham, o menu vira sanduíche, as fotos que eram fundo
  passam a ser imagens no fluxo e o menu de sabores vira duas colunas.

O layout das seções está em `src/loja/secoes.css`; os modais e o painel usam a
variante `celular:` do Tailwind (definida em `src/index.css` com o mesmo corte).

## Tipografia

**Fraunces** nos títulos serifados e **Inter** nos textos, botões e navegação,
servidas pelo próprio site (`public/fonts`), só com o alfabeto latino e o que a página
usa: a Fraunces já vem com os eixos `SOFT` 80 e `WONK` 1 aplicados e pesos de 400 a
700; a Inter, de 400 a 600. Isso deixa os arquivos com metade do tamanho e evita
pedir fonte ao Google a cada visita. Se um dia precisar de outro peso, as fontes
precisam ser geradas de novo a partir do Google Fonts.

---

## Segurança

Decisões que valem conhecer antes de mexer:

- **Senhas** são guardadas só como hash bcrypt (custo 12). A senha em texto nunca
  toca o banco.
- **Autorização é no servidor.** Esconder o botão no navegador não protege nada:
  toda rota que cria, altera, reordena ou apaga passa pelo middleware `exigirAdmin`.
- **Login** devolve sempre a mesma mensagem para e-mail inexistente e senha errada,
  e leva o mesmo tempo nos dois casos — senão dá para descobrir quais e-mails existem.
  Há limite de 10 tentativas a cada 15 minutos.
- **A sessão** é um JWT de 8 horas guardado em `sessionStorage`, enviado no cabeçalho
  `Authorization`. Não usa cookie, então não há superfície de CSRF.
- **Política de segurança (CSP)** nas páginas publicadas, como `<meta>` (o GitHub
  Pages não deixa configurar cabeçalhos): só roda script do próprio site e só se fala
  com a API. É o que impede um script injetado de levar o token do painel. Ao
  acrescentar um serviço de fora (métricas, por exemplo), ele precisa entrar na
  política em `vite.config.ts`.
- **Upload de imagem:** o navegador reduz a foto e recusa formato errado, mas quem
  decide é o servidor: o arquivo é reprocessado pelo `sharp`, o que valida que é
  mesmo uma imagem (extensão e Content-Type se falsificam), descarta qualquer coisa
  embutida nos metadados e padroniza o tamanho. Nada é gravado em disco com nome
  vindo do cliente.
- **SQL** é sempre parametrizado. No `UPDATE` os nomes de coluna vêm de uma lista
  fixa no código, nunca do corpo da requisição.
- **O que vem da API é validado no navegador** antes de usar (`src/lib/produto.ts`):
  item fora do formato é descartado e a imagem só pode ser um caminho da própria API.
- **CORS** aceita só as origens listadas em `ORIGENS_PERMITIDAS`. Nunca `*`.
- **Erros** chegam genéricos ao cliente; o detalhe fica no log do servidor.

---

## Limitações conhecidas

- **A imagem do produto é guardada no banco**, não em disco: o disco do Render é
  apagado a cada deploy. Funciona bem para dezenas de produtos; para centenas,
  valeria um armazenamento de arquivos à parte.
- **Sair do painel não invalida o token** no servidor — ele continua válido até
  expirar (8 h). É o preço de uma sessão sem estado.
- **Preços não são confiáveis no servidor** — ver o aviso acima.
- O bloco "Peça seu Doce Sabor" no rodapé é informativo: não há formulário por trás.
- O link do Instagram aponta para `instagram.com` genérico, à espera do perfil da loja.
- Os alertas do `npm audit` (dependência `braces`) vêm da ferramenta de linha de
  comando do shadcn, usada só para adicionar componentes; ela não vai para o site.
