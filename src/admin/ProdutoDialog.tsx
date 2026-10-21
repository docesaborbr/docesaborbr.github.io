import { useEffect, useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProdutoApi } from "@/lib/produto";
import { SessaoExpirada, salvarProduto, urlImagem } from "./api";
import { campoTexto, eyebrow, rotulo } from "./estilos";

type Props = {
  /** null cria um produto novo */
  produto: ProdutoApi | null;
  onFechar: () => void;
  onSalvo: (mensagem: string) => void;
  onSessaoExpirada: () => void;
};

/** Montado a cada abertura (o pai troca a key), então o formulário sempre começa limpo. */
export function ProdutoDialog({ produto, onFechar, onSalvo, onSessaoExpirada }: Props) {
  const [nome, setNome] = useState(produto?.nome ?? "");
  const [descricao, setDescricao] = useState(produto?.descricao ?? "");
  const [preco, setPreco] = useState(produto ? String(produto.preco) : "");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previaArquivo, setPreviaArquivo] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  // a URL temporária da prévia segura o arquivo na memória até ser revogada
  useEffect(() => {
    if (!arquivo) return;
    const url = URL.createObjectURL(arquivo);
    setPreviaArquivo(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  const previa = arquivo ? previaArquivo : produto && urlImagem(produto);

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    setSalvando(true);

    const dados = new FormData();
    dados.append("nome", nome);
    dados.append("descricao", descricao);
    dados.append("preco", preco);
    if (arquivo) dados.append("imagem", arquivo);

    try {
      await salvarProduto(produto?.id ?? null, dados);
      onSalvo(produto ? "Produto atualizado." : "Produto adicionado.");
    } catch (falha) {
      if (falha instanceof SessaoExpirada) onSessaoExpirada();
      else setErro(falha instanceof Error ? falha.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent
        className="max-h-[90vh] gap-0 overflow-y-auto rounded-lg border border-dourado bg-rosa px-[34px] pt-[30px] pb-[34px] text-foreground ring-0 sm:max-w-[620px] celular:px-5"
        aria-describedby={undefined}
      >
        <DialogHeader className="mb-[26px] gap-0 pr-12">
          <p className={eyebrow}>{produto ? "Editando" : "Novo"}</p>
          <DialogTitle className="mt-2 font-display font-bold text-[40px] leading-none celular:text-[30px]">
            {produto ? produto.nome : "Novo produto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={aoEnviar} className="grid gap-[18px]">
          <div className="grid gap-[7px]">
            <Label htmlFor="nome" className={rotulo}>
              Nome do sabor
            </Label>
            <Input
              id="nome"
              maxLength={80}
              required
              autoFocus
              className={campoTexto}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="grid gap-[7px]">
            <Label htmlFor="descricao" className={rotulo}>
              Descrição <span className="opacity-60">(opcional)</span>
            </Label>
            <Textarea
              id="descricao"
              rows={2}
              maxLength={300}
              className={`${campoTexto} min-h-0 resize-y`}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="grid gap-[7px]">
            <Label htmlFor="preco" className={rotulo}>
              Preço (R$)
            </Label>
            <Input
              id="preco"
              type="number"
              min="0"
              max="9999"
              step="0.01"
              required
              className={campoTexto}
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
            />
          </div>

          <div className="grid gap-[7px]">
            <Label htmlFor="imagem" className={rotulo}>
              Foto <span className="opacity-60">(JPG ou PNG, até 5 MB)</span>
            </Label>
            <Input
              id="imagem"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={`${campoTexto} py-2 text-sm`}
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            />
          </div>
          {previa && (
            <img src={previa} alt="" width={120} height={120} className="size-[120px] rounded-md border border-dourado object-cover" />
          )}

          {erro && (
            <Alert variant="destructive">
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}

          <div className="mt-2.5 flex items-center justify-between gap-[18px] celular:flex-col celular:items-stretch">
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
