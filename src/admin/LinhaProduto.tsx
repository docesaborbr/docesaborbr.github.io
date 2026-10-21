import { ChevronDownIcon, ChevronUpIcon, StarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { emReais } from "@/lib/dinheiro";
import type { ProdutoApi } from "@/lib/produto";
import { urlImagem } from "./api";

type Props = {
  produto: ProdutoApi;
  primeiro: boolean;
  ultimo: boolean;
  /** enquanto uma mudança deste produto (ou da ordem) está indo para o servidor */
  ocupado: boolean;
  onSubir: () => void;
  onDescer: () => void;
  onAlternarEsgotado: () => void;
  onAlternarDestaque: () => void;
  onEditar: () => void;
  onExcluir: () => void;
};

const alternavel =
  "aria-pressed:border-marrom aria-pressed:bg-marrom aria-pressed:text-rosa aria-pressed:hover:opacity-100";

export function LinhaProduto(props: Props) {
  const { produto, primeiro, ultimo, ocupado } = props;
  const imagem = urlImagem(produto);

  return (
    <Card className="grid grid-cols-[auto_64px_1fr_110px_auto] items-center gap-x-[18px] gap-y-2.5 rounded-md py-3.5 pr-[18px] pl-2 ring-0 celular:grid-cols-[auto_56px_1fr]">
      <div className="flex flex-col">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Subir ${produto.nome} no cardápio`}
          disabled={primeiro || ocupado}
          onClick={props.onSubir}
        >
          <ChevronUpIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Descer ${produto.nome} no cardápio`}
          disabled={ultimo || ocupado}
          onClick={props.onDescer}
        >
          <ChevronDownIcon />
        </Button>
      </div>

      <div className="size-16 overflow-hidden rounded-sm celular:size-14">
        {imagem ? (
          <img
            src={imagem}
            alt=""
            loading="lazy"
            width={64}
            height={64}
            className={`size-full object-cover ${produto.esgotado ? "opacity-45 grayscale" : ""}`}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-rosa text-center text-[11px] opacity-70">
            sem foto
          </div>
        )}
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-display text-[19px] leading-tight">{produto.nome}</h3>
          {produto.destaque && <Badge className="bg-dourado text-marrom">Sabor da semana</Badge>}
          {produto.esgotado && <Badge>Esgotado hoje</Badge>}
        </div>
        {produto.descricao && <p className="mt-1 text-sm leading-[1.35] opacity-75">{produto.descricao}</p>}
      </div>

      <span className="text-base font-medium celular:col-start-3">{emReais(produto.preco)}</span>

      <div className="flex flex-wrap justify-end gap-2 celular:col-span-full celular:justify-stretch celular:[&>button]:flex-1">
        <Button
          variant="outline"
          size="sm"
          aria-pressed={produto.esgotado}
          title="Some do pedido só hoje; amanhã volta sozinho ao cardápio"
          disabled={ocupado}
          onClick={props.onAlternarEsgotado}
          className={alternavel}
        >
          Esgotado hoje
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-pressed={produto.destaque}
          title="Aparece primeiro no cardápio, com selo dourado"
          disabled={ocupado}
          onClick={props.onAlternarDestaque}
          className="aria-pressed:border-dourado aria-pressed:bg-dourado aria-pressed:text-marrom aria-pressed:hover:opacity-100"
        >
          <StarIcon />
          Sabor da semana
        </Button>
        <Button variant="outline" size="sm" onClick={props.onEditar}>
          Editar
        </Button>
        <Button variant="destructive" size="sm" onClick={props.onExcluir}>
          Excluir
        </Button>
      </div>
    </Card>
  );
}
