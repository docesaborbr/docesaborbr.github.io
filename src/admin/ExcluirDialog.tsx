import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ProdutoApi } from "@/lib/produto";
import { SessaoExpirada, excluirProduto } from "./api";
import { eyebrow } from "./estilos";

type Props = {
  produto: ProdutoApi;
  onFechar: () => void;
  onExcluido: () => void;
  onFalha: (mensagem: string) => void;
  onSessaoExpirada: () => void;
};

export function ExcluirDialog({ produto, onFechar, onExcluido, onFalha, onSessaoExpirada }: Props) {
  const [excluindo, setExcluindo] = useState(false);

  // Não é um AlertDialogAction: ele fecha a caixa no clique, antes de a API responder.
  async function confirmar() {
    setExcluindo(true);
    try {
      await excluirProduto(produto.id);
      onExcluido();
    } catch (falha) {
      if (falha instanceof SessaoExpirada) onSessaoExpirada();
      else onFalha(falha instanceof Error ? falha.message : "Não foi possível excluir.");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <AlertDialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <AlertDialogContent className="gap-0 rounded-lg border border-dourado bg-rosa px-[34px] pt-[30px] pb-[34px] text-foreground ring-0 data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-[620px]">
        <AlertDialogHeader className="mb-[26px] place-items-start gap-0 text-left">
          <p className={eyebrow}>Atenção</p>
          <AlertDialogTitle className="mt-2 font-display font-bold text-[40px] leading-none celular:text-[30px]">
            Excluir produto
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription className="text-base leading-[1.45] text-foreground">
          Excluir “{produto.nome}”? Esta ação não pode ser desfeita.
        </AlertDialogDescription>
        <AlertDialogFooter className="mx-0 mt-7 mb-0 flex-row justify-between gap-[18px] rounded-none border-0 bg-transparent p-0 sm:justify-between">
          <AlertDialogCancel variant="outline" size="default">
            Manter
          </AlertDialogCancel>
          <Button variant="destructive" disabled={excluindo} onClick={confirmar}>
            {excluindo ? "Excluindo…" : "Excluir"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
