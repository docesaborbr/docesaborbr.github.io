-- Esquema do Doce Sabor.
-- Roda sozinho na subida do servidor (db.js), e é seguro rodar de novo.

CREATE TABLE IF NOT EXISTS administradores (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  senha_hash    TEXT NOT NULL,           -- bcrypt; a senha em texto nunca é gravada
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS produtos (
  id            SERIAL PRIMARY KEY,
  nome          TEXT NOT NULL,
  descricao     TEXT NOT NULL DEFAULT '',
  preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0),
  imagem        BYTEA,                   -- a foto mora no banco: o disco do Render é apagado a cada deploy
  imagem_tipo   TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS produtos_nome_idx ON produtos (nome);

-- O controle de estoque foi retirado: a loja mostra tudo que estiver cadastrado.
ALTER TABLE produtos DROP COLUMN IF EXISTS estoque;

-- "Esgotado hoje": o dia, no calendário da loja (America/Sao_Paulo), em que a dona
-- marcou o sabor como esgotado. Ele só conta como esgotado enquanto essa data for
-- a de hoje, então no dia seguinte volta sozinho, sem ninguém precisar desmarcar.
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS esgotado_em DATE;

-- Ordem dos sabores na loja, escolhida pela dona no painel.
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ordem INTEGER;

-- Quem ainda não tem ordem entra depois dos que já têm, em ordem alfabética, que é
-- como a loja listava os sabores antes desta coluna. Só mexe nas linhas sem ordem:
-- rodar de novo não desfaz a ordem que a dona escolheu.
UPDATE produtos AS p
   SET ordem = novos.ordem
  FROM (SELECT id,
               (SELECT COALESCE(MAX(ordem), 0) FROM produtos)
                 + row_number() OVER (ORDER BY lower(nome), id) AS ordem
          FROM produtos
         WHERE ordem IS NULL) AS novos
 WHERE p.id = novos.id;

ALTER TABLE produtos ALTER COLUMN ordem SET NOT NULL;

-- "Sabor da semana". O índice parcial só guarda as linhas em destaque e, por ser
-- único, o próprio banco impede que haja duas.
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS destaque BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS produtos_um_destaque ON produtos (destaque) WHERE destaque;
