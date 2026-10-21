import { useRef, useState } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { emReais } from "@/lib/dinheiro";
import { mensagemPedido, totalItens, totalValor, type Carrinho } from "./carrinho";
import type { Produto } from "./catalogo";
import { ENDERECO_LOJA, LINK_WHATSAPP } from "./contato";
import { caixaModal, rodapeModal, tituloModal } from "./MenuDialog";

type Props = {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  produtos: readonly Produto[];
  carrinho: Carrinho;
  pedidoEnviado: boolean;
  onMudar: (id: string, delta: number) => void;
  onEsvaziar: () => void;
  onPedidoEnviado: () => void;
  onEscolherMais: () => void;
};

type Modo = "retirada" | "entrega" | null;

export function CarrinhoDialog(props: Props) {
  const { aberto, onOpenChange, produtos, carrinho, pedidoEnviado, onMudar, onEsvaziar, onEscolherMais } = props;
  const itens = totalItens(carrinho);

  // Finalizar não manda direto: o pedido chegava na loja sem dizer se alguém vem
  // buscar ou se é para entregar, e em que endereço.
  const [perguntandoEntrega, setPerguntandoEntrega] = useState(false);
  const [modo, setModo] = useState<Modo>(null);
  const [endereco, setEndereco] = useState("");
  const [enderecoFaltando, setEnderecoFaltando] = useState(false);
  const campoEndereco = useRef<HTMLTextAreaElement>(null);

  // carrinho esvaziado (pelos botões de quantidade) volta para o resumo
  const noPassoEntrega = perguntandoEntrega && itens > 0;

  function voltarAoResumo() {
    setPerguntandoEntrega(false);
    setModo(null);
    setEnderecoFaltando(false);
  }

  function enviarPedido(entrega: string) {
    if (itens === 0) return;
    const texto = mensagemPedido(carrinho, produtos, entrega);
    window.open(LINK_WHATSAPP + "?text=" + encodeURIComponent(texto), "_blank", "noopener");
    setEndereco("");
    voltarAoResumo();
    props.onPedidoEnviado();
  }

  // Retirada não precisa de mais nada: segue direto para o WhatsApp. Pedir endereço
  // a quem vai buscar no balcão faria a pessoa inventar alguma coisa só para enviar.
  function escolherRetirada() {
    setModo("retirada");
    enviarPedido(`Retirada na loja (${ENDERECO_LOJA})`);
  }

  function escolherEntrega() {
    setModo("entrega");
    // o campo só aparece depois deste render
    requestAnimationFrame(() => campoEndereco.current?.focus());
  }

  function enviarComEndereco() {
    const limpo = endereco.trim();
    if (!limpo) {
      setEnderecoFaltando(true);
      campoEndereco.current?.focus();
      return;
    }
    enviarPedido("Entrega em: " + limpo);
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className={`${caixaModal} sm:max-w-[620px]`} aria-describedby={undefined}>
        <DialogHeader className="mb-[26px] gap-0 pr-12">
          <p className="eyebrow">Quase lá</p>
          <DialogTitle className={tituloModal}>Seu carrinho</DialogTitle>
        </DialogHeader>

        {itens > 0 && (
          <ul>
            {[...carrinho].map(([id, qtd]) => {
              const p = produtos.find((produto) => produto.id === id);
              if (!p) return null;
              return (
                <li
                  key={id}
                  className="grid grid-cols-[1fr_auto_96px] items-center gap-4 border-b py-4 celular:grid-cols-[1fr_auto] celular:gap-y-2.5"
                >
                  <span className="text-base">{p.nome}</span>
                  <div className="flex items-center gap-3 text-[15px]">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label={"Remover uma unidade de " + p.nome}
                      onClick={() => onMudar(id, -1)}
                    >
                      <MinusIcon />
                    </Button>
                    <span>{qtd} un</span>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label={"Adicionar uma unidade de " + p.nome}
                      onClick={() => onMudar(id, 1)}
                    >
                      <PlusIcon />
                    </Button>
                  </div>
                  <strong className="text-right text-base celular:col-start-2">{emReais(p.preco * qtd)}</strong>
                </li>
              );
            })}
          </ul>
        )}

        {pedidoEnviado && itens === 0 && (
          <Alert className="mt-[18px] mb-1 rounded-none border-0 border-l-3 border-l-dourado px-4 py-3.5">
            <AlertDescription className="text-[15px] leading-[1.45] text-foreground">
              Pedido enviado pelo WhatsApp. Confirme por lá e o carrinho já está livre para um novo pedido.
            </AlertDescription>
          </Alert>
        )}
        {!pedidoEnviado && itens === 0 && (
          <p className="py-[18px] text-[15px]">Você ainda não escolheu nenhum bolo de pote.</p>
        )}

        {itens > 0 && (
          <div className="flex items-baseline justify-between pt-5 text-lg">
            <span>Total</span>
            <strong className="text-2xl">{emReais(totalValor(carrinho, produtos))}</strong>
          </div>
        )}
        {itens > 0 && !noPassoEntrega && (
          <Button variant="link" className="mt-3.5 self-start text-sm" onClick={onEsvaziar}>
            Esvaziar carrinho
          </Button>
        )}

        {noPassoEntrega && (
          <div className="mt-[22px]">
            <p className="mb-3.5 font-display text-[22px] leading-tight">Como você quer receber?</p>
            <div className="grid grid-cols-2 gap-3 celular:grid-cols-1 celular:gap-2.5" role="group" aria-label="Forma de entrega">
              <OpcaoEntrega
                titulo="Retirar na loja"
                detalhe={ENDERECO_LOJA}
                escolhida={modo === "retirada"}
                onClick={escolherRetirada}
              />
              <OpcaoEntrega
                titulo="Receber em casa"
                detalhe="Informe o endereço"
                escolhida={modo === "entrega"}
                onClick={escolherEntrega}
              />
            </div>

            {modo === "entrega" && (
              <div className="mt-[18px] grid gap-[7px]">
                <Label htmlFor="endereco" className="text-sm font-normal">
                  Endereço para entrega
                </Label>
                <Textarea
                  id="endereco"
                  ref={campoEndereco}
                  rows={2}
                  maxLength={200}
                  required
                  aria-invalid={enderecoFaltando || undefined}
                  aria-describedby={enderecoFaltando ? "enderecoErro" : undefined}
                  placeholder="Rua, número, bairro e um ponto de referência"
                  className="min-h-0 resize-y rounded-lg bg-white px-[13px] py-[11px] text-[15px] leading-[1.4] md:text-[15px]"
                  value={endereco}
                  onChange={(evento) => {
                    setEndereco(evento.target.value);
                    setEnderecoFaltando(false);
                  }}
                />
                {enderecoFaltando && (
                  <p id="enderecoErro" className="text-sm text-destructive">
                    Informe o endereço para a entrega.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {noPassoEntrega ? (
          <div className={rodapeModal}>
            <Button variant="outline" onClick={voltarAoResumo}>
              Voltar
            </Button>
            {modo === "entrega" && <Button onClick={enviarComEndereco}>Enviar pelo WhatsApp</Button>}
          </div>
        ) : (
          <div className={rodapeModal}>
            <Button variant="outline" onClick={onEscolherMais}>
              Escolher mais
            </Button>
            <Button disabled={itens === 0} onClick={() => setPerguntandoEntrega(true)}>
              Finalizar compra
            </Button>
          </div>
        )}
        <p className="mt-4 text-[13px] opacity-75">O pedido é confirmado pelo WhatsApp da loja.</p>
      </DialogContent>
    </Dialog>
  );
}

function OpcaoEntrega({
  titulo,
  detalhe,
  escolhida,
  onClick,
}: {
  titulo: string;
  detalhe: string;
  escolhida: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      aria-pressed={escolhida}
      onClick={onClick}
      className="group h-auto flex-col items-start gap-[5px] rounded-xl bg-white px-[18px] py-4 text-left whitespace-normal hover:border-marrom hover:opacity-100 aria-pressed:border-marrom aria-pressed:bg-marrom celular:px-4 celular:py-3.5"
    >
      <strong className="font-display text-[17px] group-aria-pressed:text-dourado">{titulo}</strong>
      <span className="text-[13px] leading-[1.35] opacity-75 group-aria-pressed:text-claro group-aria-pressed:opacity-90">
        {detalhe}
      </span>
    </Button>
  );
}
