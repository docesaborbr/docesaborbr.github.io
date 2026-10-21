import { useEffect, useRef } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { emReais } from "@/lib/dinheiro";
import { totalItens, totalValor, type Carrinho } from "./carrinho";
import type { Produto } from "./catalogo";

/** Caixa comum ao menu e ao carrinho: rosa com moldura dourada, tela cheia no celular. */
export const caixaModal =
  "flex max-h-[90vh] flex-col gap-0 overflow-y-auto rounded-lg border border-dourado bg-rosa px-[34px] pt-[30px] pb-[34px] text-foreground ring-0 " +
  "celular:inset-0 celular:h-full celular:max-h-none celular:max-w-none celular:translate-0 celular:rounded-none celular:border-0 celular:px-5 celular:pt-[22px] celular:pb-7";

export const tituloModal = "mt-2 font-display font-bold text-[40px] leading-none celular:text-[30px]";
export const rodapeModal =
  "mt-7 flex items-center justify-between gap-[18px] celular:flex-col celular:items-stretch celular:[&_button]:w-full";

type Props = {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  produtos: readonly Produto[];
  carrinho: Carrinho;
  onMudar: (id: string, delta: number) => void;
  onIrCarrinho: () => void;
};

export function MenuDialog({ aberto, onOpenChange, produtos, carrinho, onMudar, onIrCarrinho }: Props) {
  const itens = totalItens(carrinho);
  const status = itens
    ? `${itens} ${itens === 1 ? "item" : "itens"} no carrinho · ${emReais(totalValor(carrinho, produtos))}`
    : "Seu carrinho está vazio.";

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className={`${caixaModal} sm:max-w-[1060px]`} aria-describedby={undefined}>
        <DialogHeader className="mb-[26px] gap-0 pr-12">
          <p className="eyebrow">Escolha os seus</p>
          <DialogTitle className={tituloModal}>Nosso menu</DialogTitle>
        </DialogHeader>

        <ul className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5 celular:grid-cols-2 celular:gap-3.5">
          {produtos.map((p) => (
            <li key={p.id}>
              <Card className="h-full items-center gap-0 rounded-md px-3.5 pt-4 pb-[18px] text-center ring-0">
                {p.img ? (
                  <img
                    src={p.img}
                    alt={"Bolo de pote sabor " + p.nome}
                    loading="lazy"
                    className="aspect-square w-full rounded-sm object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-sm bg-rosa text-[13px] opacity-70">
                    sem foto
                  </div>
                )}
                <h3 className="mt-3.5 font-display text-[19px] leading-tight celular:text-base">{p.nome}</h3>
                <p className="mt-1.5 mb-3.5 text-[15px]">{emReais(p.preco)}</p>
                <div className="mt-auto w-full">
                  <ControleQuantidade produto={p} quantidade={carrinho.get(p.id) ?? 0} onMudar={onMudar} />
                </div>
              </Card>
            </li>
          ))}
        </ul>

        <div className={rodapeModal}>
          <p className="text-[15px]" role="status">
            {status}
          </p>
          <Button onClick={onIrCarrinho}>Ir para o carrinho</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Um "Adicionar" enquanto o sabor não está no carrinho, e os botões de quantidade
 * depois — assim o cliente ajusta o pedido sem sair do menu.
 */
function ControleQuantidade({
  produto,
  quantidade,
  onMudar,
}: {
  produto: Produto;
  quantidade: number;
  onMudar: (id: string, delta: number) => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const seguirFoco = useRef(false);
  const vazio = quantidade === 0;

  // O botão clicado some quando "Adicionar" vira −/+ (ou o contrário). Sem isto o
  // foco cairia na caixa do diálogo e quem usa teclado perderia o lugar na lista.
  useEffect(() => {
    if (!seguirFoco.current) return;
    seguirFoco.current = false;
    caixa.current?.querySelector<HTMLButtonElement>(vazio ? "button" : "button:last-of-type")?.focus();
  }, [vazio]);

  function mudar(delta: number) {
    seguirFoco.current = vazio || quantidade + delta === 0;
    onMudar(produto.id, delta);
  }

  return (
    <div ref={caixa}>
      {vazio ? (
        <Button variant="outline" className="h-[38px] w-full text-[13.5px]" onClick={() => mudar(1)}>
          Adicionar
        </Button>
      ) : (
        <div className="flex h-[38px] items-center justify-between gap-2 rounded-full border border-dourado px-1.5">
          <Button
            variant="quantidade"
            size="icon"
            aria-label={"Remover uma unidade de " + produto.nome}
            onClick={() => mudar(-1)}
          >
            <MinusIcon />
          </Button>
          <span className="text-sm">{quantidade} un</span>
          <Button
            variant="quantidade"
            size="icon"
            aria-label={"Adicionar uma unidade de " + produto.nome}
            onClick={() => mudar(1)}
          >
            <PlusIcon />
          </Button>
        </div>
      )}
    </div>
  );
}
