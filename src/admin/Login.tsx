import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { entrar } from "./api";
import { AvisoServidorAcordando } from "./AvisoServidorAcordando";
import { campoTexto, eyebrow, rotulo, tituloPainel } from "./estilos";
import { useDemora } from "./useDemora";

type Props = { aviso: string; onEntrou: () => void };

export function Login({ aviso, onEntrou }: Props) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const demorando = useDemora(enviando);
  const mensagem = erro || aviso;

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await entrar(email, senha);
      setSenha("");
      onEntrou();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="flex justify-center pt-10">
      <Card className="w-full max-w-[420px] gap-0 rounded-lg border border-dourado py-0 ring-0">
        <form onSubmit={aoEnviar} autoComplete="on" className="px-8 pt-[34px] pb-9">
          <CardHeader className="mb-[26px] gap-0 px-0">
            <p className={eyebrow}>Acesso restrito</p>
            <h1 className={tituloPainel}>Painel da loja</h1>
          </CardHeader>
          <CardContent className="grid gap-[18px] px-0">
            <div className="grid gap-[7px]">
              <Label htmlFor="email" className={rotulo}>
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                className={campoTexto}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-[7px]">
              <Label htmlFor="senha" className={rotulo}>
                Senha
              </Label>
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                required
                className={campoTexto}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
            {mensagem && (
              <Alert variant="destructive">
                <AlertDescription>{mensagem}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? "Entrando…" : "Entrar"}
            </Button>
            {demorando && <AvisoServidorAcordando />}
          </CardContent>
        </form>
      </Card>
    </section>
  );
}
