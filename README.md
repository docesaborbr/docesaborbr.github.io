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
npm test           # testes do carrinho e da mensagem do pedido (Vitest)
npm run build      # confere os tipos e gera o site final em dist/
npm run preview    # serve o dist/ para conferir o build
```

## Arquivos

```
├── index.html             → a loja (só o <head>; o conteúdo vem de src/loja)
├── admin.html             → painel da dona da loja (login + produtos)
├── src/
│   ├── index.css          → tema: cores da marca, fontes e tokens do shadcn
│   ├── config.ts          → endereço da API (vale para a loja e o painel)
│   ├── components/ui/     → componentes do shadcn/ui (código nosso, pode editar)
│   ├── components/icones.tsx  ícones de Instagram, WhatsApp e sacola
│   ├── lib/               → formatação de preço e validação do que vem da API
│   ├── loja/              → seções da página, menu, carrinho e regras do pedido
│   │   ├── secoes.css     → layout das seções, ajustado em px/vw à mão
│   │   ├── catalogo.ts    → lista de reserva e leitura do catálogo da API
│   │   ├── carrinho.ts    → regras do carrinho e texto do WhatsApp (com testes)
│   │   └── contato.ts     → WhatsApp, Instagram e endereço da loja
│   └── admin/             → login, lista, formulário e exclusão de produtos
├── public/                → copiado como está: favicon.ico e images/
├── .github/workflows/     → build e publicação no GitHub Pages
├── components.json        → configuração do shadcn/ui
├── render.yaml            → configuração do deploy da API no Render
└── backend/               → a API (Node + Express + PostgreSQL)
    ├── server.js         rotas, CORS, limites, tratamento de erro
    ├── db.js             conexão com o Postgres
    ├── auth.js           bcrypt, JWT e o middleware que barra quem não é admin
    ├── routes/produtos.js CRUD e tratamento da imagem
    ├── schema.sql        tabelas
    ├── scripts/          criar-admin e o Postgres de desenvolvimento
    └── tests/            testes de integração
```

A página tem estas seções, nesta ordem: navegação, hero, Nossos Sabores,
O Melhor Bolo de Pote, Sobre Nós, Nós Entregamos (endereço, horário e forma de
retirada), galeria e rodapé.

O endereço aparece **num lugar só**, na faixa marrom "Nós Entregamos", alcançável
pelo link "Onde estamos" do menu. Repetir esse dado em vários cantos cria trabalho
de manutenção e faz o cliente duvidar de qual está certo quando um deles ficar
desatualizado.

---

## Rodando com o back-end

O site sozinho funciona (veja acima). Para mexer no painel da loja, são três terminais:

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

O `backend/.env` guarda a senha do banco, o segredo das sessões e a senha do
administrador. **Ele nunca vai para o Git** — está no `.gitignore`. Use o
`.env.example` como molde.

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

Os testes sobem um Postgres de verdade e exercitam login, autorização e upload:

```bash
cd backend && npm test
```

### Publicando a API no Render

O `render.yaml` já descreve o serviço. No painel do Render: **New → Blueprint**,
aponte para este repositório e preencha as variáveis marcadas como `sync: false`
(`DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_SENHA`). O `JWT_SECRET` o Render gera sozinho.

A URL do serviço fica em `src/config.ts`. O banco é o Neon; a `DATABASE_URL` é colada
no painel do Render e nunca entra no repositório.

> No plano gratuito o servidor hiberna após 15 minutos parado e a primeira
> requisição pode levar meio minuto. Por isso a loja abre com uma lista de sabores
> de reserva (em `src/loja/catalogo.ts`) e troca pelos dados reais quando a API responde —
> **a loja nunca aparece vazia**, mesmo com a API fora do ar.

> Se a conexão com o banco falhar com erro de certificado, o provedor usa uma CA
> própria: coloque o certificado na variável `DATABASE_CA_CERT`. Não desative a
> validação — ela é o que impede alguém no caminho de ler a senha do banco.

---

## Como o pedido funciona

O catálogo vem da API; o carrinho e o fechamento acontecem no navegador:

1. O cliente clica em **Explore o menu** (ou em qualquer botão "Faça seu pedido pelo
   WhatsApp") e vê os sabores disponíveis.
2. Cada **Adicionar** soma uma unidade. O contador dourado na barra de navegação
   acompanha.
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

### Número do WhatsApp

Uma linha só, em `src/loja/contato.ts`:

```ts
export const WHATSAPP = "5547997417610"; // único lugar para trocar o número: 55 + DDD + número
```

Os ícones de WhatsApp da página derivam dessa mesma constante, então não é preciso
mexer em mais nada — eles nunca vão apontar para um número diferente do carrinho.

### Sabores e preços

**Com o back-end no ar, isso se faz pelo painel** (`/admin.html`), sem tocar em código:
adicionar, editar nome, descrição, preço e foto, ou excluir. Tudo que estiver
cadastrado aparece na loja — não há controle de estoque.

A lista abaixo, em `src/loja/catalogo.ts`, é só a **reserva** usada enquanto a API
não responde:

```ts
export const RESERVA: Produto[] = [
  { id: "morango-creme", nome: "Morango com creme", preco: 15, img: "/images/menu-morango-creme.jpg" },
  ...
];
```

Vale mantê-la parecida com o catálogo real, já que é ela que o cliente vê nos
primeiros segundos enquanto a API acorda.

### Endereço, horário e contato

O horário e o restante do endereço ficam na seção `Entregamos` de
`src/loja/Secoes.tsx`. A rua vem de `ENDERECO_LOJA`, em `src/loja/contato.ts`, a
mesma usada na opção "Retirar na loja" do carrinho e na mensagem do pedido. O
telefone aparece também no rodapé (`src/loja/Rodape.tsx`), em `FALE COM A GENTE`.

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

---

## Responsivo

- **≥ 1350px** — medidas fixas em pixels.
- **860px – 1349px** — o mesmo desenho encolhe proporcionalmente (medidas em `vw`).
- **≤ 859px** — as colunas empilham, o menu vira sanduíche, as fotos que eram fundo
  passam a ser imagens no fluxo e o menu de sabores vira duas colunas.

O layout das seções está em `src/loja/secoes.css`; os modais e o painel usam a
variante `celular:` do Tailwind (definida em `src/index.css` com o mesmo corte).

## Tipografia

Duas fontes do Google Fonts: **Fraunces** (com os eixos `SOFT` e `WONK` ativados) nos
títulos serifados e **Inter** nos textos, botões e navegação.

---

## Segurança

Decisões que valem conhecer antes de mexer:

- **Senhas** são guardadas só como hash bcrypt (custo 12). A senha em texto nunca
  toca o banco.
- **Autorização é no servidor.** Esconder o botão no navegador não protege nada:
  toda rota que cria, altera ou apaga passa pelo middleware `exigirAdmin`.
- **Login** devolve sempre a mesma mensagem para e-mail inexistente e senha errada,
  e leva o mesmo tempo nos dois casos — senão dá para descobrir quais e-mails existem.
- **A sessão** é um JWT de 8 horas guardado em `sessionStorage`, enviado no cabeçalho
  `Authorization`. Não usa cookie, então não há superfície de CSRF.
- **Upload de imagem:** o arquivo é reprocessado pelo `sharp`, o que valida que é
  mesmo uma imagem (extensão e Content-Type se falsificam), descarta qualquer coisa
  embutida nos metadados e padroniza o tamanho. Nada é gravado em disco com nome
  vindo do cliente.
- **SQL** é sempre parametrizado. No `UPDATE` os nomes de coluna vêm de uma lista
  fixa no código, nunca do corpo da requisição.
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
- A página não tem tags Open Graph nem favicon, então o link compartilhado no WhatsApp
  aparece sem imagem e sem descrição.
