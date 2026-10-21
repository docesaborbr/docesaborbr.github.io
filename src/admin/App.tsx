import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { emReais } from "@/lib/dinheiro";
import type { ProdutoApi } from "@/lib/produto";
import { SessaoExpirada, acordarServidor, guardaToken, listarProdutos, urlImagem } from "./api";
import { AvisoServidorAcordando } from "./AvisoServidorAcordando";
import { ExcluirDialog } from "./ExcluirDialog";
import { eyebrow, tituloPainel } from "./estilos";
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
              {produtos?.map((p) => (
                <LinhaProduto
                  key={p.id}
                  produto={p}
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

function LinhaProduto({
  produto,
  onEditar,
  onExcluir,
}: {
  produto: ProdutoApi;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const imagem = urlImagem(produto);

  return (
    <Card className="grid grid-cols-[64px_1fr_110px_auto] items-center gap-[18px] rounded-md px-[18px] py-3.5 ring-0 celular:grid-cols-[56px_1fr] celular:gap-y-2.5">
      <div className="size-16 overflow-hidden rounded-sm celular:size-14">
        {imagem ? (
          <img src={imagem} alt="" loading="lazy" width={64} height={64} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center bg-rosa text-center text-[11px] opacity-70">
            sem foto
          </div>
        )}
      </div>
      <div>
        <h3 className="font-display text-[19px] leading-tight">{produto.nome}</h3>
        {produto.descricao && <p className="mt-1 text-sm leading-[1.35] opacity-75">{produto.descricao}</p>}
      </div>
      <span className="text-base font-medium celular:col-start-2">{emReais(produto.preco)}</span>
      <div className="flex gap-2 celular:col-span-full celular:[&>button]:flex-1">
        <Button variant="outline" size="sm" onClick={onEditar}>
          Editar
        </Button>
        <Button variant="destructive" size="sm" onClick={onExcluir}>
          Excluir
        </Button>
      </div>
    </Card>
  );
}
