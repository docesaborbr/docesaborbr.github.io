import { API } from "@/config";
import { lerProdutosApi, type ProdutoApi } from "@/lib/produto";

/**
 * O token fica em sessionStorage: some ao fechar a aba e nunca é enviado
 * automaticamente pelo navegador, então não existe superfície de CSRF.
 */
export const guardaToken = {
  ler: (): string | null => {
    try {
      return sessionStorage.getItem("ds_token");
    } catch {
      return null;
    }
  },
  gravar: (token: string): void => {
    try {
      sessionStorage.setItem("ds_token", token);
    } catch {
      /* sem armazenamento: a sessão dura até recarregar */
    }
  },
  limpar: (): void => {
    try {
      sessionStorage.removeItem("ds_token");
    } catch {
      /* nada a limpar */
    }
  },
};

/** O servidor recusou o token: quem chamou deve voltar para a tela de login. */
export class SessaoExpirada extends Error {}

const FALHA_GENERICA = "Não foi possível concluir a operação.";
const FORA_DO_AR = "Servidor fora do ar. Tente de novo em instantes.";

async function buscar(url: string, opcoes: RequestInit): Promise<Response> {
  try {
    return await fetch(url, opcoes);
  } catch {
    throw new Error(FORA_DO_AR);
  }
}

async function erroDaResposta(resposta: Response, padrao: string): Promise<Error> {
  const corpo: unknown = await resposta.json().catch(() => null);
  const mensagem =
    typeof corpo === "object" && corpo !== null && typeof (corpo as { erro?: unknown }).erro === "string"
      ? (corpo as { erro: string }).erro
      : padrao;
  return new Error(mensagem);
}

/** Toda chamada autenticada passa por aqui: centraliza o token e a sessão expirada. */
async function chamar(caminho: string, opcoes: RequestInit = {}): Promise<Response> {
  const cabecalhos = new Headers(opcoes.headers);
  const token = guardaToken.ler();
  if (token) cabecalhos.set("Authorization", "Bearer " + token);

  const resposta = await buscar(API + caminho, { ...opcoes, headers: cabecalhos });
  if (resposta.status === 401) {
    guardaToken.limpar();
    throw new SessaoExpirada();
  }
  if (!resposta.ok) throw await erroDaResposta(resposta, FALHA_GENERICA);
  return resposta;
}

export async function entrar(email: string, senha: string): Promise<void> {
  const resposta = await buscar(API + "/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });
  if (!resposta.ok) throw await erroDaResposta(resposta, "Não foi possível entrar.");

  const corpo: unknown = await resposta.json().catch(() => null);
  const token = (corpo as { token?: unknown } | null)?.token;
  if (typeof token !== "string") throw new Error("Não foi possível entrar.");
  guardaToken.gravar(token);
}

export async function listarProdutos(): Promise<ProdutoApi[]> {
  const resposta = await chamar("/api/produtos");
  const produtos = lerProdutosApi(await resposta.json().catch(() => null));
  if (!produtos) throw new Error(FALHA_GENERICA);
  return produtos;
}

export async function salvarProduto(id: number | null, dados: FormData): Promise<void> {
  await chamar(id === null ? "/api/produtos" : "/api/produtos/" + id, {
    method: id === null ? "POST" : "PUT",
    body: dados,
  });
}

export async function excluirProduto(id: number): Promise<void> {
  await chamar("/api/produtos/" + id, { method: "DELETE" });
}

export const urlImagem = (produto: ProdutoApi): string | null => (produto.imagem ? API + produto.imagem : null);
