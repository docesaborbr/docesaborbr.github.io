const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const { consultar, emTransacao } = require("../db");
const { exigirAdmin } = require("../auth");

const router = express.Router();

const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5 MB
const LADO_DA_FOTO = 600;
const MAXIMO_NA_ORDEM = 1000;
const MAIOR_ID = 2_147_483_647; // teto do SERIAL; um id maior derrubaria a query com erro 500
const MARCACOES = ["esgotado", "destaque"];

// O dia vira à meia-noite da loja, não à do banco, que pode estar em outro fuso:
// com CURRENT_DATE num banco em UTC, o "esgotado hoje" acabaria às 21h.
const HOJE_NA_LOJA = "(now() AT TIME ZONE 'America/Sao_Paulo')::date";

// Todo SELECT e RETURNING usa esta lista: o "esgotado" sai sempre calculado do
// mesmo jeito, e esgotado_em e ordem nunca chegam ao cliente.
const COLUNAS_DO_PRODUTO = `id, nome, descricao, preco_centavos,
  imagem IS NOT NULL AS tem_imagem,
  COALESCE(esgotado_em = ${HOJE_NA_LOJA}, false) AS esgotado,
  destaque`;

// Destacar e reordenar mexem em vários produtos na mesma transação. As duas começam
// travando todos eles, sempre na mesma ordem, e assim uma espera a outra terminar.
// Sem isso, duas marcações de destaque simultâneas esbarrariam no índice único, e
// duas transações travando linhas em ordens diferentes poderiam entrar em deadlock.
const TRAVAR_TODOS = "SELECT id FROM produtos ORDER BY id FOR UPDATE";

// Arquivo fica em memória: nada é gravado em disco com nome vindo do cliente,
// o que elimina path traversal e execução de arquivo enviado.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO, files: 1 },
});

/**
 * Reprocessa a imagem com sharp. Isso faz três coisas de uma vez:
 * valida que o conteúdo é mesmo uma imagem (extensão e Content-Type se falsificam),
 * descarta qualquer payload embutido nos metadados, e padroniza o tamanho.
 */
async function normalizarImagem(buffer) {
  const jpeg = await sharp(buffer)
    .resize(LADO_DA_FOTO, LADO_DA_FOTO, { fit: "cover", position: "centre" })
    .jpeg({ quality: 84, progressive: true })
    .toBuffer();
  return { dados: jpeg, tipo: "image/jpeg" };
}

/** Valida e converte o corpo do formulário. Devolve {erros, valores}. */
function validarProduto(corpo, { parcial = false } = {}) {
  const erros = [];
  const valores = {};

  const nome = typeof corpo.nome === "string" ? corpo.nome.trim() : "";
  if (nome) {
    if (nome.length > 80) erros.push("O nome deve ter até 80 caracteres.");
    else valores.nome = nome;
  } else if (!parcial) {
    erros.push("Informe o nome do produto.");
  }

  const descricao = typeof corpo.descricao === "string" ? corpo.descricao.trim() : "";
  if (descricao.length > 300) erros.push("A descrição deve ter até 300 caracteres.");
  else if (descricao || !parcial) valores.descricao = descricao;

  if (corpo.preco !== undefined && corpo.preco !== "") {
    const preco = Number(String(corpo.preco).replace(",", "."));
    if (!Number.isFinite(preco) || preco < 0 || preco > 9999) {
      erros.push("O preço deve ser um número entre 0 e 9999.");
    } else {
      valores.preco_centavos = Math.round(preco * 100);
    }
  } else if (!parcial) {
    erros.push("Informe o preço.");
  }

  return { erros, valores };
}

function ehIdValido(valor) {
  return Number.isInteger(valor) && valor > 0 && valor <= MAIOR_ID;
}

/** Valida o corpo do PATCH: só esgotado e/ou destaque, cada um true ou false. Devolve {motivo} ou {marcacoes}. */
function validarMarcacoes(corpo) {
  const chaves = corpo && typeof corpo === "object" && !Array.isArray(corpo) ? Object.keys(corpo) : [];
  if (!chaves.length) return { motivo: "Nada para alterar." };
  if (!chaves.every((chave) => MARCACOES.includes(chave))) {
    return { motivo: "Só é possível alterar esgotado e destaque." };
  }
  if (!chaves.every((chave) => typeof corpo[chave] === "boolean")) {
    return { motivo: "Esgotado e destaque devem ser true ou false." };
  }
  return { marcacoes: { esgotado: corpo.esgotado, destaque: corpo.destaque } };
}

/** Valida o corpo do PUT /ordem: {ids: [...]}, sem repetir produto. Devolve {motivo} ou {ids}. */
function validarOrdem(corpo) {
  const ids = corpo && typeof corpo === "object" ? corpo.ids : undefined;
  if (!Array.isArray(ids) || ids.length > MAXIMO_NA_ORDEM || !ids.every(ehIdValido)) {
    return { motivo: `Envie a ordem como uma lista de até ${MAXIMO_NA_ORDEM} ids de produto.` };
  }
  if (new Set(ids).size !== ids.length) return { motivo: "A ordem repete um produto." };
  return { ids };
}

function paraJson(linha) {
  return {
    id: linha.id,
    nome: linha.nome,
    descricao: linha.descricao,
    preco: linha.preco_centavos / 100,
    imagem: linha.tem_imagem ? `/api/produtos/${linha.id}/imagem` : null,
    esgotado: linha.esgotado,
    destaque: linha.destaque,
  };
}

/* ---------------------------------------------------------------- público */

router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await consultar(
      `SELECT ${COLUNAS_DO_PRODUTO} FROM produtos ORDER BY ordem, id`
    );
    res.json(rows.map(paraJson));
  } catch (erro) {
    next(erro);
  }
});

router.get("/:id/imagem", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ erro: "Id inválido." });

    const { rows } = await consultar(
      "SELECT imagem, imagem_tipo FROM produtos WHERE id = $1",
      [id]
    );
    if (!rows[0] || !rows[0].imagem) return res.status(404).json({ erro: "Sem imagem." });

    res.type(rows[0].imagem_tipo || "image/jpeg");
    res.set("Cache-Control", "public, max-age=300");
    res.send(rows[0].imagem);
  } catch (erro) {
    next(erro);
  }
});

/* ------------------------------------------------ somente administrador */

router.post("/", exigirAdmin, upload.single("imagem"), async (req, res, next) => {
  try {
    const { erros, valores } = validarProduto(req.body);
    if (erros.length) return res.status(400).json({ erro: erros.join(" ") });

    let foto = { dados: null, tipo: null };
    if (req.file) {
      try {
        foto = await normalizarImagem(req.file.buffer);
      } catch {
        return res.status(400).json({ erro: "O arquivo enviado não é uma imagem válida." });
      }
    }

    const { rows } = await consultar(
      `INSERT INTO produtos (nome, descricao, preco_centavos, imagem, imagem_tipo, ordem)
       VALUES ($1, $2, $3, $4, $5, (SELECT COALESCE(MAX(ordem), 0) + 1 FROM produtos))
       RETURNING ${COLUNAS_DO_PRODUTO}`,
      [valores.nome, valores.descricao, valores.preco_centavos, foto.dados, foto.tipo]
    );
    res.status(201).json(paraJson(rows[0]));
  } catch (erro) {
    next(erro);
  }
});

// Precisa vir antes do PUT /:id, senão o Express trataria "ordem" como um id.
router.put("/ordem", exigirAdmin, async (req, res, next) => {
  try {
    const { motivo, ids } = validarOrdem(req.body);
    if (motivo) return res.status(400).json({ erro: motivo });

    const listaMudou = await emTransacao(async (cliente) => {
      const { rows } = await cliente.query(TRAVAR_TODOS);
      const atuais = new Set(rows.map((linha) => linha.id));
      if (ids.length !== atuais.size || !ids.every((id) => atuais.has(id))) return true;

      await cliente.query(
        `UPDATE produtos AS p SET ordem = v.ordem
           FROM unnest($1::int[]) WITH ORDINALITY AS v(id, ordem)
          WHERE p.id = v.id`,
        [ids]
      );
      return false;
    });

    if (listaMudou) {
      return res.status(409).json({ erro: "A lista de produtos mudou. Recarregue e tente de novo." });
    }
    res.status(204).end();
  } catch (erro) {
    next(erro);
  }
});

router.put("/:id", exigirAdmin, upload.single("imagem"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ erro: "Id inválido." });

    const { erros, valores } = validarProduto(req.body, { parcial: true });
    if (erros.length) return res.status(400).json({ erro: erros.join(" ") });

    if (req.file) {
      try {
        const foto = await normalizarImagem(req.file.buffer);
        valores.imagem = foto.dados;
        valores.imagem_tipo = foto.tipo;
      } catch {
        return res.status(400).json({ erro: "O arquivo enviado não é uma imagem válida." });
      }
    }

    const campos = Object.keys(valores);
    if (!campos.length) return res.status(400).json({ erro: "Nada para alterar." });

    // Os nomes de coluna vêm da lista fixa acima, nunca do corpo da requisição;
    // os valores seguem parametrizados.
    const atribuicoes = campos.map((campo, i) => `${campo} = $${i + 1}`);
    const parametros = campos.map((campo) => valores[campo]);

    const { rows } = await consultar(
      `UPDATE produtos SET ${atribuicoes.join(", ")}, atualizado_em = now()
        WHERE id = $${campos.length + 1}
       RETURNING ${COLUNAS_DO_PRODUTO}`,
      [...parametros, id]
    );
    if (!rows[0]) return res.status(404).json({ erro: "Produto não encontrado." });
    res.json(paraJson(rows[0]));
  } catch (erro) {
    next(erro);
  }
});

router.patch("/:id", exigirAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!ehIdValido(id)) return res.status(400).json({ erro: "Id inválido." });

    const { motivo, marcacoes } = validarMarcacoes(req.body);
    if (motivo) return res.status(400).json({ erro: motivo });

    const produto = await emTransacao(async (cliente) => {
      if (marcacoes.destaque === true) {
        const { rows: todos } = await cliente.query(TRAVAR_TODOS);
        if (!todos.some((linha) => linha.id === id)) return null;
        // O anterior sai antes de o novo entrar: o índice único não aceita dois
        // destaques nem por um instante, mesmo dentro da transação.
        await cliente.query("UPDATE produtos SET destaque = false WHERE destaque AND id <> $1", [id]);
      }

      // Marcação que não veio no corpo chega como null e mantém o valor atual.
      const { rows } = await cliente.query(
        `UPDATE produtos
            SET esgotado_em = CASE WHEN $2::boolean IS NULL THEN esgotado_em
                                   WHEN $2 THEN ${HOJE_NA_LOJA}
                                   ELSE NULL END,
                destaque = COALESCE($3::boolean, destaque),
                atualizado_em = now()
          WHERE id = $1
         RETURNING ${COLUNAS_DO_PRODUTO}`,
        [id, marcacoes.esgotado ?? null, marcacoes.destaque ?? null]
      );
      return rows[0] || null;
    });

    if (!produto) return res.status(404).json({ erro: "Produto não encontrado." });
    res.json(paraJson(produto));
  } catch (erro) {
    next(erro);
  }
});

router.delete("/:id", exigirAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ erro: "Id inválido." });

    const { rowCount } = await consultar("DELETE FROM produtos WHERE id = $1", [id]);
    if (!rowCount) return res.status(404).json({ erro: "Produto não encontrado." });
    res.status(204).end();
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
