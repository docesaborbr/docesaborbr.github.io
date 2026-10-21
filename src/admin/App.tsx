import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import type { ProdutoApi } from "@/lib/produto";
import {
  SessaoExpirada,
  acordarServidor,
  alterarProduto,
  guardaToken,
  listarProdutos,
  reordenarProdutos,
} from "./api";
import { AvisoServidorAcordando } from "./AvisoServidorAcordando";
import { ExcluirDialog } from "./ExcluirDialog";
import { eyebrow, tituloPainel } from "./estilos";
import { LinhaProduto } from "./LinhaProduto";
import { Login } from "./Login";
import { ProdutoDialog } from "./ProdutoDialog";
import { useDemora } from "./useDemora";

/** Qual produto está no formulário: null é um novo. A `chave` remonta o formulário limpo. */
type Edicao = { produto: ProdutoApi | null; chave: number };

export function App() {
  const [logado, setLogado] = useState(() => guardaToken.ler() !== null);
  const [avisoLogin, setAvisoLogin] = useState("");
  const [produtos, setProdutos] = useState<ProdutoApi[] | null>(null);
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [excluindo, setExcluindo] = useState<ProdutoApi | null>(null);
  // id do produto cuja mudança está indo para o servidor; "ordem" enquanto reordena
  const [ocupado, setOcupado] = useState<number | "ordem" | null>(null);
  const listaDemorando = useDemora(logado && produtos === null);

  // Enquanto a dona digita a senha, o servidor já vai acordando.
  useEffect(() => acordarServidor(), []);

  const sessaoExpirou = useCallback(() => {
    guardaToken.limpar();
    setEdicao(null);
    setExcluindo(null);
    setProdutos(null);
    setLogado(false);
    setAvisoLogin("Sua sessão expirou. Entre novamente.");
  }, []);

  const carregar = useCallback(async () => {
    try {
      setProdutos(await listarProdutos());
    } catch (falha) {
      if (falha instanceof SessaoExpirada) sessaoExpirou();
      else toast.error(falha instanceof Error ? falha.message : "Não foi possível carregar os produtos.");
    }
  }, [sessaoExpirou]);

  useEffect(() => {
    if (logado) void carregar();
  }, [logado, carregar]);

  function sair() {
    guardaToken.limpar();
    setProdutos(null);
    setAvisoLogin("");
    setLogado(false);
  }

  function aoSalvar(mensagem: string) {
    setEdicao(null);
    toast.success(mensagem);
    void carregar();
  }

  function aoExcluir() {
    setExcluindo(null);
    toast.success("Produto excluído.");
    void carregar();
  }

  function avisarFalha(falha: unknown) {
    if (falha instanceof SessaoExpirada) sessaoExpirou();
    else toast.error(falha instanceof Error ? falha.message : "Não foi possível concluir a operação.");
  }

  /** Muda na tela na hora e confirma com o servidor; em caso de erro, a lista volta ao que ele diz. */
  async function alternar(produto: ProdutoApi, campo: "esgotado" | "destaque") {
    const valor = !produto[campo];
    setProdutos((lista) =>
      lista?.map((p) => {
        if (p.id === produto.id) return { ...p, [campo]: valor };
        // só um sabor da semana: marcar um tira o dos outros (o servidor faz o mesmo)
        return campo === "destaque" && valor ? { ...p, destaque: false } : p;
      }) ?? null,
    );
    setOcupado(produto.id);
    try {
      await alterarProduto(produto.id, { [campo]: valor });
      toast.success(mensagemDaMudanca(produto.nome, campo, valor));
    } catch (falha) {
      avisarFalha(falha);
    } finally {
      setOcupado(null);
      void carregar();
    }
  }

  async function mover(indice: number, deslocamento: -1 | 1) {
    if (!produtos) return;
    const nova = [...produtos];
    const [item] = nova.splice(indice, 1);
    if (!item) return;
    nova.splice(indice + deslocamento, 0, item);
    setProdutos(nova);
    setOcupado("ordem");
    try {
      await reordenarProdutos(nova.map((p) => p.id));
    } catch (falha) {
      avisarFalha(falha);
      void carregar();
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="min-h-screen bg-rosa">
      <header className="sticky top-0 z-50 h-[72px] border-b border-dourado bg-rosa">
        <div className="flex h-full items-center justify-between px-11 celular:px-5">
          <a href="/" className="font-display text-[28px] leading-none celular:text-[26px]">
            Doce Sabor
          </a>
          {logado && (
            <Button variant="outline" size="sm" onClick={sair}>
              Sair
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1060px] px-11 pt-11 pb-20 celular:px-5 celular:pt-7 celular:pb-15">
        {!logado ? (
          <Login
            aviso={avisoLogin}
            onEntrou={() => {
              setAvisoLogin("");
              setLogado(true);
            }}
          />
        ) : (
          <section>
            <div className="mb-[30px] flex items-end justify-between gap-5 celular:flex-col celular:items-stretch celular:gap-4">
              <div>
                <p className={eyebrow}>Seus produtos</p>
                <h1 className={tituloPainel}>Bolos de pote</h1>
              </div>
              <Button onClick={() => setEdicao({ produto: null, chave: Date.now() })}>Adicionar produto</Button>
            </div>

            {produtos === null && (
              <div className="grid gap-2 py-[30px]">
                <p className="text-[15px]">Carregando…</p>
                {listaDemorando && <AvisoServidorAcordando />}
              </div>
            )}
            {produtos?.length === 0 && <p className="py-[30px] text-[15px]">Nenhum produto cadastrado ainda.</p>}

            <div className="grid gap-3">
              {produtos?.map((p, indice) => (
                <LinhaProduto
                  key={p.id}
                  produto={p}
                  primeiro={indice === 0}
                  ultimo={indice === produtos.length - 1}
                  ocupado={ocupado === "ordem" || ocupado === p.id}
                  onSubir={() => void mover(indice, -1)}
                  onDescer={() => void mover(indice, 1)}
                  onAlternarEsgotado={() => void alternar(p, "esgotado")}
                  onAlternarDestaque={() => void alternar(p, "destaque")}
                  onEditar={() => setEdicao({ produto: p, chave: Date.now() })}
                  onExcluir={() => setExcluindo(p)}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {edicao && (
        <ProdutoDialog
          key={edicao.chave}
          produto={edicao.produto}
          onFechar={() => setEdicao(null)}
          onSalvo={aoSalvar}
          onSessaoExpirada={sessaoExpirou}
        />
      )}
      {excluindo && (
        <ExcluirDialog
          produto={excluindo}
          onFechar={() => setExcluindo(null)}
          onExcluido={aoExcluir}
          onFalha={(mensagem) => toast.error(mensagem)}
          onSessaoExpirada={sessaoExpirou}
        />
      )}
      <Toaster position="top-center" />
    </div>
  );
}

function mensagemDaMudanca(nome: string, campo: "esgotado" | "destaque", valor: boolean): string {
  if (campo === "esgotado") {
    return valor ? `“${nome}” esgotado hoje. Amanhã volta sozinho ao cardápio.` : `“${nome}” voltou ao cardápio.`;
  }
  return valor ? `“${nome}” é o sabor da semana.` : `“${nome}” saiu do destaque.`;
}
