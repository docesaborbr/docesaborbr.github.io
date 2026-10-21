/**
 * Teste de integração contra um Postgres de verdade (embutido).
 * Cobre o caminho feliz e, principalmente, as tentativas de burlar a autorização.
 *
 *   npm test
 */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");

const EmbeddedPostgres = require("embedded-postgres").default || require("embedded-postgres");
const sharp = require("sharp");

const SENHA_ADMIN = "senha-de-teste-123";
const EMAIL_ADMIN = "teste@docesabor.com.br";

let pg, servidor, base, token;

before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "doce-pg-"));
  pg = new EmbeddedPostgres({
    databaseDir: dir,
    user: "postgres",
    password: "teste",
    port: 54329,
    persistent: false,
    // O banco de produção não precisa estar no fuso da loja. Rodar os testes num fuso
    // bem longe do de São Paulo (UTC+14) faz a suíte pegar quem usar CURRENT_DATE no
    // lugar da data da loja.
    postgresFlags: ["-c", "timezone=Pacific/Kiritimati"],
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("docesabor_teste");

  process.env.DATABASE_URL = "postgres://postgres:teste@localhost:54329/docesabor_teste";
  process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres-ok";
  process.env.ADMIN_EMAIL = EMAIL_ADMIN;
  process.env.ADMIN_SENHA = SENHA_ADMIN;
  process.env.ORIGENS_PERMITIDAS = "http://localhost:8000";

  const { app } = require("../server");
  const { migrar } = require("../db");
  await migrar();

  // recria o admin do zero (semearAdmin só roda no iniciar())
  const { consultar } = require("../db");
  const { gerarHash } = require("../auth");
  await consultar(
    `INSERT INTO administradores (email, senha_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET senha_hash = EXCLUDED.senha_hash`,
    [EMAIL_ADMIN, await gerarHash(SENHA_ADMIN)]
  );

  await new Promise((ok) => { servidor = app.listen(0, ok); });
  base = "http://127.0.0.1:" + servidor.address().port;
}, { timeout: 120_000 });

after(async () => {
  if (servidor) servidor.close();
  const { encerrar } = require("../db");
  await encerrar();
  if (pg) await pg.stop();
});

const json = (caminho, opcoes) => fetch(base + caminho, opcoes);

async function fotoDeTeste() {
  return sharp({ create: { width: 40, height: 40, channels: 3, background: "#C9A227" } })
    .png()
    .toBuffer();
}

const comToken = () => ({ Authorization: "Bearer " + token });
const comTokenAdulterado = () => ({ Authorization: "Bearer " + token.slice(0, -3) + "aaa" });

async function criarProduto(nome) {
  const dados = new FormData();
  dados.append("nome", nome);
  dados.append("preco", "15");
  const r = await json("/api/produtos", { method: "POST", headers: comToken(), body: dados });
  assert.equal(r.status, 201);
  return r.json();
}

function marcar(id, corpo, cabecalhos = comToken()) {
  return json("/api/produtos/" + id, {
    method: "PATCH",
    headers: { ...cabecalhos, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
}

function reordenar(corpo, cabecalhos = comToken()) {
  return json("/api/produtos/ordem", {
    method: "PUT",
    headers: { ...cabecalhos, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
}

const listaPublica = async () => (await fetch(base + "/api/produtos")).json();
const produtoNaLista = async (id) => (await listaPublica()).find((p) => p.id === id);
const idsNaLista = async () => (await listaPublica()).map((p) => p.id);
const idsEmDestaque = async () => (await listaPublica()).filter((p) => p.destaque).map((p) => p.id);

/* ------------------------------------------------------------- login */

test("login com senha errada é recusado", async () => {
  const r = await json("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL_ADMIN, senha: "errada" }),
  });
  assert.equal(r.status, 401);
});

test("login com e-mail inexistente devolve a mesma mensagem", async () => {
  const r = await json("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "ninguem@lugar.com", senha: "errada" }),
  });
  const corpo = await r.json();
  assert.equal(r.status, 401);
  // não pode revelar que o e-mail não existe
  assert.match(corpo.erro, /E-mail ou senha incorretos/);
});

test("login correto devolve token", async () => {
  const r = await json("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL_ADMIN, senha: SENHA_ADMIN }),
  });
  const corpo = await r.json();
  assert.equal(r.status, 200);
  assert.ok(corpo.token);
  token = corpo.token;
});

test("a senha nunca é gravada em texto", async () => {
  const { consultar } = require("../db");
  const { rows } = await consultar("SELECT senha_hash FROM administradores WHERE email = $1", [EMAIL_ADMIN]);
  assert.ok(rows[0].senha_hash.startsWith("$2"), "deveria ser um hash bcrypt");
  assert.ok(!rows[0].senha_hash.includes(SENHA_ADMIN));
});

test("e-mail inexistente demora o mesmo que e-mail real (sem oráculo de tempo)", async () => {
  const medir = async (email) => {
    const t = Date.now();
    await json("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha: "senha-qualquer-errada" }),
    });
    return Date.now() - t;
  };

  const existente = await medir(EMAIL_ADMIN);
  const inexistente = await medir("naoexiste@lugar.nenhum");

  // Se o hash de fachada tivesse tamanho inválido, o bcrypt devolveria na hora
  // e o e-mail inexistente responderia perto de 0 ms.
  assert.ok(
    inexistente > existente / 3,
    `e-mail inexistente respondeu em ${inexistente}ms contra ${existente}ms do real`
  );
});

test("trocar ADMIN_SENHA redefine a senha na subida (recuperação de acesso)", async () => {
  const { semearAdmin } = require("../server");
  const NOVA = "senha-trocada-no-painel-do-render";

  process.env.ADMIN_SENHA = NOVA;
  await semearAdmin();

  const antiga = await json("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL_ADMIN, senha: SENHA_ADMIN }),
  });
  assert.equal(antiga.status, 401, "a senha antiga deve parar de funcionar");

  const nova = await json("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL_ADMIN, senha: NOVA }),
  });
  assert.equal(nova.status, 200, "a senha nova deve entrar");

  // devolve o estado para os testes seguintes
  process.env.ADMIN_SENHA = SENHA_ADMIN;
  await semearAdmin();
  token = (await (await json("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL_ADMIN, senha: SENHA_ADMIN }),
  })).json()).token;
});

/* ----------------------------------------------------- autorização */

test("criar produto sem token é barrado", async () => {
  const dados = new FormData();
  dados.append("nome", "Invasor");
  dados.append("preco", "10");
  const r = await json("/api/produtos", { method: "POST", body: dados });
  assert.equal(r.status, 401);
});

test("token adulterado é recusado", async () => {
  const r = await json("/api/produtos", {
    method: "POST",
    headers: { Authorization: "Bearer " + token.slice(0, -3) + "aaa" },
    body: new FormData(),
  });
  assert.equal(r.status, 401);
});

test("excluir sem token é barrado", async () => {
  const r = await json("/api/produtos/1", { method: "DELETE" });
  assert.equal(r.status, 401);
});

/* ---------------------------------------------------------- produtos */

let idCriado;

test("cria produto com imagem", async () => {
  const dados = new FormData();
  dados.append("nome", "Ninho com Nutella");
  dados.append("descricao", "Camadas de creme de ninho");
  dados.append("preco", "19,90");
  dados.append("imagem", new Blob([await fotoDeTeste()], { type: "image/png" }), "foto.png");

  const r = await json("/api/produtos", {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
    body: dados,
  });
  const corpo = await r.json();
  assert.equal(r.status, 201);
  assert.equal(corpo.nome, "Ninho com Nutella");
  assert.equal(corpo.preco, 19.9, "preço com vírgula deve ser aceito");
  assert.ok(corpo.imagem);
  idCriado = corpo.id;
});

test("a imagem enviada é servida como JPEG normalizado", async () => {
  const r = await fetch(base + "/api/produtos/" + idCriado + "/imagem");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("content-type"), "image/jpeg");
  const meta = await sharp(Buffer.from(await r.arrayBuffer())).metadata();
  assert.equal(meta.width, 600, "deve ter sido redimensionada");
});

test("arquivo que não é imagem é recusado", async () => {
  const dados = new FormData();
  dados.append("nome", "Fake");
  dados.append("preco", "10");
  // extensão e Content-Type mentem: o conteúdo é um script
  dados.append("imagem", new Blob(["<?php system($_GET[0]); ?>"], { type: "image/jpeg" }), "x.jpg");

  const r = await json("/api/produtos", {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
    body: dados,
  });
  assert.equal(r.status, 400);
});

test("preço negativo é recusado", async () => {
  const dados = new FormData();
  dados.append("nome", "Negativo");
  dados.append("preco", "-5");
  const r = await json("/api/produtos", {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
    body: dados,
  });
  assert.equal(r.status, 400);
});

test("nome com aspas e ponto-e-vírgula não quebra a query", async () => {
  const nome = `Pote'; DROP TABLE produtos; --`;
  const dados = new FormData();
  dados.append("nome", nome);
  dados.append("preco", "12");
  const r = await json("/api/produtos", {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
    body: dados,
  });
  assert.equal(r.status, 201);

  const lista = await (await fetch(base + "/api/produtos")).json();
  assert.ok(lista.some((p) => p.nome === nome), "a tabela continua de pé e o nome foi salvo literal");
});

test("atualiza o preço sem apagar os outros campos", async () => {
  const dados = new FormData();
  dados.append("preco", "21.50");
  const r = await json("/api/produtos/" + idCriado, {
    method: "PUT",
    headers: { Authorization: "Bearer " + token },
    body: dados,
  });
  const corpo = await r.json();
  assert.equal(r.status, 200);
  assert.equal(corpo.preco, 21.5);
  assert.equal(corpo.nome, "Ninho com Nutella", "o nome não deve ter sido apagado");
});

test("a listagem pública traz todo produto cadastrado", async () => {
  const lista = await (await fetch(base + "/api/produtos")).json();
  assert.ok(lista.length > 0);
  assert.ok(lista.every((p) => p.nome && typeof p.preco === "number"));
  assert.ok(lista.every((p) => !("estoque" in p)), "estoque saiu do modelo");
});

test("a lista pública não expõe os bytes da imagem", async () => {
  const lista = await (await fetch(base + "/api/produtos")).json();
  const p = lista.find((x) => x.id === idCriado);
  assert.equal(typeof p.imagem, "string");
  assert.ok(p.imagem.startsWith("/api/produtos/"));
});

test("atualizar produto inexistente devolve 404", async () => {
  const dados = new FormData();
  dados.append("preco", "10");
  const r = await json("/api/produtos/999999", {
    method: "PUT",
    headers: { Authorization: "Bearer " + token },
    body: dados,
  });
  assert.equal(r.status, 404);
});

test("exclui produto", async () => {
  const r = await json("/api/produtos/" + idCriado, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token },
  });
  assert.equal(r.status, 204);

  const lista = await (await fetch(base + "/api/produtos")).json();
  assert.ok(!lista.some((p) => p.id === idCriado));
});

test("erro interno não vaza detalhe de infraestrutura", async () => {
  const r = await fetch(base + "/api/produtos/nao-e-numero/imagem");
  const corpo = await r.json();
  assert.equal(r.status, 400);
  assert.ok(!JSON.stringify(corpo).match(/postgres|pg|stack|at Object/i));
});

/* ------------------------------------------- marcações e ordem: acesso */

test("marcar e reordenar sem token é barrado", async () => {
  const p = await criarProduto("Paçoca");
  assert.equal((await marcar(p.id, { esgotado: true }, {})).status, 401);
  assert.equal((await reordenar({ ids: [p.id] }, {})).status, 401);
  assert.equal((await produtoNaLista(p.id)).esgotado, false, "nada pode ter mudado");
});

test("marcar e reordenar com token adulterado é recusado", async () => {
  const p = await criarProduto("Limão siciliano");
  assert.equal((await marcar(p.id, { destaque: true }, comTokenAdulterado())).status, 401);
  assert.equal((await reordenar({ ids: [p.id] }, comTokenAdulterado())).status, 401);
  assert.equal((await produtoNaLista(p.id)).destaque, false, "nada pode ter mudado");
});

/* ------------------------------------------------------- esgotado hoje */

test("marcar como esgotado aparece na loja, e desmarcar libera", async () => {
  const { consultar } = require("../db");
  const p = await criarProduto("Prestígio");
  assert.equal(p.esgotado, false, "produto novo não nasce esgotado");
  await consultar("UPDATE produtos SET atualizado_em = now() - interval '1 day' WHERE id = $1", [p.id]);

  const marcado = await marcar(p.id, { esgotado: true });
  assert.equal(marcado.status, 200);
  assert.equal((await marcado.json()).esgotado, true);
  assert.equal((await produtoNaLista(p.id)).esgotado, true);

  const { rows } = await consultar(
    "SELECT atualizado_em > now() - interval '1 hour' AS recente FROM produtos WHERE id = $1",
    [p.id]
  );
  assert.equal(rows[0].recente, true, "a marcação atualiza o atualizado_em, como o PUT");

  const desmarcado = await marcar(p.id, { esgotado: false });
  assert.equal(desmarcado.status, 200);
  assert.equal((await desmarcado.json()).esgotado, false);
  assert.equal((await produtoNaLista(p.id)).esgotado, false);
});

test("esgotado grava a data de hoje em São Paulo, seja qual for o fuso do banco", async () => {
  const { consultar } = require("../db");
  const { rows: fuso } = await consultar("SELECT current_setting('TimeZone') AS nome");
  assert.equal(fuso[0].nome, "Pacific/Kiritimati", "o teste só prova algo com o banco fora do fuso da loja");

  const p = await criarProduto("Abacaxi com coco");
  await marcar(p.id, { esgotado: true });
  const { rows } = await consultar(
    `SELECT esgotado_em = (now() AT TIME ZONE 'America/Sao_Paulo')::date AS hoje_na_loja
       FROM produtos WHERE id = $1`,
    [p.id]
  );
  assert.equal(rows[0].hoje_na_loja, true);
});

test("esgotado ontem volta sozinho: no dia seguinte o sabor está disponível", async () => {
  const { consultar } = require("../db");
  const p = await criarProduto("Ninho com morango");
  await marcar(p.id, { esgotado: true });
  assert.equal((await produtoNaLista(p.id)).esgotado, true);

  await consultar(
    "UPDATE produtos SET esgotado_em = (now() AT TIME ZONE 'America/Sao_Paulo')::date - 1 WHERE id = $1",
    [p.id]
  );
  assert.equal((await produtoNaLista(p.id)).esgotado, false);
});

/* ----------------------------------------------------- sabor da semana */

test("destacar outro sabor tira o destaque do anterior, e desmarcar limpa", async () => {
  const a = await criarProduto("Doce de leite");
  const b = await criarProduto("Chocolate com wafer");

  const ra = await marcar(a.id, { destaque: true });
  assert.equal(ra.status, 200);
  assert.equal((await ra.json()).destaque, true);
  assert.deepEqual(await idsEmDestaque(), [a.id]);

  const rb = await marcar(b.id, { destaque: true });
  assert.equal(rb.status, 200);
  assert.deepEqual(await idsEmDestaque(), [b.id], "só o último marcado fica em destaque");

  // destacar de novo quem já está em destaque não pode esbarrar no índice único
  assert.equal((await marcar(b.id, { destaque: true })).status, 200);
  assert.deepEqual(await idsEmDestaque(), [b.id]);

  const desmarcado = await marcar(b.id, { destaque: false });
  assert.equal(desmarcado.status, 200);
  assert.equal((await desmarcado.json()).destaque, false);
  assert.deepEqual(await idsEmDestaque(), []);
});

test("dois destaques ao mesmo tempo terminam com um só em destaque", async () => {
  const a = await criarProduto("Maracujá");
  const b = await criarProduto("Morango com creme");
  for (let rodada = 0; rodada < 5; rodada++) {
    const respostas = await Promise.all([
      marcar(a.id, { destaque: true }),
      marcar(b.id, { destaque: true }),
    ]);
    assert.deepEqual(respostas.map((r) => r.status), [200, 200]);
    assert.equal((await idsEmDestaque()).length, 1);
  }
});

test("esgotado e destaque vão juntos, e a marcação que não veio fica como estava", async () => {
  const p = await criarProduto("Cenoura com chocolate");

  const juntos = await (await marcar(p.id, { esgotado: true, destaque: true })).json();
  assert.equal(juntos.esgotado, true);
  assert.equal(juntos.destaque, true);

  const semDestaque = await (await marcar(p.id, { destaque: false })).json();
  assert.equal(semDestaque.esgotado, true, "mexer no destaque não desfaz o esgotado");
  assert.equal(semDestaque.destaque, false);

  await marcar(p.id, { destaque: true });
  const disponivel = await (await marcar(p.id, { esgotado: false })).json();
  assert.equal(disponivel.esgotado, false);
  assert.equal(disponivel.destaque, true, "mexer no esgotado não desfaz o destaque");
});

/* ------------------------------------------------- marcação inválida */

test("marcação que não é true nem false é recusada", async () => {
  const p = await criarProduto("Coco queimado");
  for (const corpo of [
    { esgotado: "true" },
    { destaque: 1 },
    { esgotado: null },
    { esgotado: true, destaque: "sim" },
  ]) {
    const r = await marcar(p.id, corpo);
    assert.equal(r.status, 400, JSON.stringify(corpo));
    assert.ok((await r.json()).erro);
  }
  const depois = await produtoNaLista(p.id);
  assert.equal(depois.esgotado, false, "nada pode ter sido gravado");
  assert.equal(depois.destaque, false);
});

test("marcação com campo desconhecido é recusada inteira", async () => {
  const p = await criarProduto("Pistache");
  for (const corpo of [
    { esgotado: true, preco: 0 },
    { ordem: 1 },
    { esgotado_em: "2000-01-01" },
    JSON.parse('{"__proto__": {"esgotado": true}}'),
  ]) {
    const r = await marcar(p.id, corpo);
    assert.equal(r.status, 400, JSON.stringify(corpo));
  }
  const depois = await produtoNaLista(p.id);
  assert.equal(depois.esgotado, false, "nem a parte válida pode ter sido gravada");
  assert.equal(depois.preco, 15);
});

test("marcação vazia é recusada", async () => {
  const p = await criarProduto("Romeu e Julieta");
  assert.equal((await marcar(p.id, {})).status, 400);
  assert.equal((await marcar(p.id, [])).status, 400);
  const semCorpo = await json("/api/produtos/" + p.id, { method: "PATCH", headers: comToken() });
  assert.equal(semCorpo.status, 400);
});

test("marcação com id inválido devolve 400", async () => {
  // "99999999999" passa de um SERIAL: sem a checagem, a query cairia com erro 500
  for (const id of ["abc", "1.5", "-3", "99999999999"]) {
    const r = await marcar(id, { esgotado: true });
    assert.equal(r.status, 400, id);
    assert.equal((await r.json()).erro, "Id inválido.");
  }
});

test("marcação de produto inexistente devolve 404 sem tirar o destaque de ninguém", async () => {
  const atual = await criarProduto("Brigadeiro gourmet");
  await marcar(atual.id, { destaque: true });

  for (const corpo of [{ esgotado: true }, { destaque: true }]) {
    const r = await marcar(999999, corpo);
    assert.equal(r.status, 404, JSON.stringify(corpo));
    assert.equal((await r.json()).erro, "Produto não encontrado.");
  }
  assert.deepEqual(await idsEmDestaque(), [atual.id], "o destaque atual continua onde estava");
});

/* ------------------------------------------------------- ordem da loja */

test("reordenar muda a ordem da loja", async () => {
  const antes = await idsNaLista();
  assert.ok(antes.length > 2);
  const invertida = [...antes].reverse();

  const r = await reordenar({ ids: invertida });
  assert.equal(r.status, 204);
  assert.deepEqual(await idsNaLista(), invertida);
});

test("reordenar com produto repetido é recusado", async () => {
  const ids = await idsNaLista();
  // do tamanho certo, mas com o primeiro também no lugar do último
  const r = await reordenar({ ids: [...ids.slice(0, -1), ids[0]] });
  assert.equal(r.status, 400);
  assert.ok((await r.json()).erro);
  assert.deepEqual(await idsNaLista(), ids);
});

test("reordenar com id que não é inteiro é recusado", async () => {
  const ids = await idsNaLista();
  for (const corpo of [
    { ids: ids.map(String) },
    { ids: [...ids.slice(0, -1), ids.at(-1) + 0.5] },
    { ids: ids.join(",") },
    { ids: null },
    {},
    ids,
  ]) {
    const r = await reordenar(corpo);
    assert.equal(r.status, 400, JSON.stringify(corpo));
  }
  assert.deepEqual(await idsNaLista(), ids);
});

test("reordenar com mais de 1000 ids é recusado", async () => {
  const r = await reordenar({ ids: Array.from({ length: 1001 }, (_, i) => i + 1) });
  assert.equal(r.status, 400);
});

test("reordenar com produto faltando ou sobrando devolve 409 e não mexe na ordem", async () => {
  const ids = await idsNaLista();
  const desatualizadas = [
    ids.slice(1), // alguém criou um produto depois que o painel carregou
    [...ids, 999999], // alguém excluiu um
    [...ids.slice(1), 999999], // mesmo tamanho, mas não são os mesmos produtos
  ];
  for (const lista of desatualizadas) {
    const r = await reordenar({ ids: [...lista].reverse() });
    assert.equal(r.status, 409);
    assert.equal((await r.json()).erro, "A lista de produtos mudou. Recarregue e tente de novo.");
  }
  assert.deepEqual(await idsNaLista(), ids);
});

test("produto novo entra no fim da ordem, mesmo vindo antes no alfabeto", async () => {
  const novo = await criarProduto("Abacate");
  const lista = await listaPublica();
  assert.equal(lista.at(-1).id, novo.id);
});

/* ------------------------------------------------- contrato do produto */

test("toda resposta de produto segue o contrato, sem esgotado_em nem ordem", async () => {
  const CAMPOS = ["descricao", "destaque", "esgotado", "id", "imagem", "nome", "preco"];

  const criado = await criarProduto("Banoffee");
  const dados = new FormData();
  dados.append("descricao", "Banana, doce de leite e chantilly");
  const alterado = await (
    await json("/api/produtos/" + criado.id, { method: "PUT", headers: comToken(), body: dados })
  ).json();
  const marcado = await (await marcar(criado.id, { destaque: true })).json();

  for (const p of [criado, alterado, marcado, ...(await listaPublica())]) {
    assert.deepEqual(Object.keys(p).sort(), CAMPOS);
    assert.equal(typeof p.esgotado, "boolean");
    assert.equal(typeof p.destaque, "boolean");
  }
  assert.equal(criado.destaque, false, "produto novo não nasce em destaque");
  assert.equal(alterado.descricao, "Banana, doce de leite e chantilly");
  assert.equal(marcado.destaque, true);
});

/* ---------------------------------------------------------------- CORS */

test("preflight de PATCH vindo da loja é liberado", async () => {
  const r = await fetch(base + "/api/produtos/1", {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:8000",
      "Access-Control-Request-Method": "PATCH",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get("access-control-allow-origin"), "http://localhost:8000");
  assert.match(r.headers.get("access-control-allow-methods"), /\bPATCH\b/);
  const permitidos = r.headers.get("access-control-allow-headers").toLowerCase();
  assert.ok(permitidos.includes("authorization") && permitidos.includes("content-type"));
});

test("preflight vindo de outro site não é liberado", async () => {
  const r = await fetch(base + "/api/produtos/1", {
    method: "OPTIONS",
    headers: { Origin: "https://site-qualquer.example", "Access-Control-Request-Method": "PATCH" },
  });
  assert.equal(r.status, 403);
  assert.equal(r.headers.get("access-control-allow-origin"), null);
});

/* ------------------------------------------------------------ migração */

test("o próprio banco recusa dois sabores em destaque", async () => {
  const { consultar } = require("../db");
  const [x, y] = await listaPublica();
  await assert.rejects(
    consultar("UPDATE produtos SET destaque = true WHERE id = ANY($1::int[])", [[x.id, y.id]]),
    { code: "23505" }
  );
});

test("rodar a migração de novo não mexe na ordem nem nas marcações", async () => {
  const { migrar } = require("../db");
  const ids = await idsNaLista();
  assert.equal((await reordenar({ ids: [...ids].reverse() })).status, 204);
  await marcar(ids[0], { esgotado: true, destaque: true });
  const antes = await listaPublica();

  await migrar();

  assert.deepEqual(await listaPublica(), antes);
});

test("a migração numera quem ficou sem ordem depois dos demais, em ordem alfabética", async () => {
  const { consultar, migrar } = require("../db");
  const cocada = await criarProduto("cocada");
  const amendoim = await criarProduto("Amendoim");
  const brigadeiro = await criarProduto("brigadeiro");
  const brigadeiro2 = await criarProduto("Brigadeiro"); // mesmo nome sem a maiúscula: desempata pelo id
  const semOrdem = [cocada.id, amendoim.id, brigadeiro.id, brigadeiro2.id];

  await consultar("ALTER TABLE produtos ALTER COLUMN ordem DROP NOT NULL");
  await consultar("UPDATE produtos SET ordem = NULL WHERE id = ANY($1::int[])", [semOrdem]);
  const { rows: [{ maior }] } = await consultar("SELECT COALESCE(MAX(ordem), 0) AS maior FROM produtos");
  const { rows: outrosAntes } = await consultar(
    "SELECT id, ordem FROM produtos WHERE ordem IS NOT NULL ORDER BY id"
  );

  await migrar();

  const { rows: numerados } = await consultar(
    "SELECT id, ordem FROM produtos WHERE id = ANY($1::int[]) ORDER BY ordem",
    [semOrdem]
  );
  assert.deepEqual(numerados.map((r) => r.id), [amendoim.id, brigadeiro.id, brigadeiro2.id, cocada.id]);
  assert.deepEqual(numerados.map((r) => r.ordem), [maior + 1, maior + 2, maior + 3, maior + 4]);

  const { rows: outrosDepois } = await consultar(
    "SELECT id, ordem FROM produtos WHERE NOT (id = ANY($1::int[])) ORDER BY id",
    [semOrdem]
  );
  assert.deepEqual(outrosDepois, outrosAntes, "quem já tinha ordem continua com a mesma");

  const { rows: [coluna] } = await consultar(
    `SELECT is_nullable FROM information_schema.columns
      WHERE table_name = 'produtos' AND column_name = 'ordem'`
  );
  assert.equal(coluna.is_nullable, "NO", "ordem volta a ser NOT NULL");
});

test("a migração prepara um banco que já tinha produtos antes destas colunas", async () => {
  const { consultar, migrar } = require("../db");
  // Como o banco de produção está hoje: produtos cadastrados e nenhuma das colunas novas.
  await consultar("ALTER TABLE produtos DROP COLUMN esgotado_em, DROP COLUMN ordem, DROP COLUMN destaque");

  await migrar();

  const lista = await listaPublica();
  const { rows: alfabetica } = await consultar("SELECT id FROM produtos ORDER BY lower(nome), id");
  assert.ok(lista.length > 2);
  assert.deepEqual(lista.map((p) => p.id), alfabetica.map((r) => r.id), "a loja abre na ordem de antes");
  assert.ok(lista.every((p) => p.esgotado === false && p.destaque === false));

  const { rows: ordens } = await consultar("SELECT ordem FROM produtos ORDER BY ordem");
  assert.deepEqual(ordens.map((r) => r.ordem), lista.map((_, i) => i + 1));

  const { rows: indice } = await consultar(
    "SELECT 1 FROM pg_indexes WHERE tablename = 'produtos' AND indexname = 'produtos_um_destaque'"
  );
  assert.equal(indice.length, 1, "o índice do destaque único volta junto");
});
