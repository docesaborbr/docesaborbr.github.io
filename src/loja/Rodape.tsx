import { HORARIO_LOJA, LOJA, telefoneParaLer } from "./contato";
import { Redes } from "./Navegacao";

export function Rodape() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-info">
          <p className="footer-logo">Doce Sabor</p>

          <div className="footer-cols">
            <div className="footer-col">
              <h3>FALE COM A GENTE</h3>
              <p>
                WhatsApp {telefoneParaLer(LOJA.whatsapp)}
                <br />
                Todos os dias, {HORARIO_LOJA}
              </p>
            </div>
          </div>

          <div className="footer-legal">
            <div className="footer-col footer-social-col">
              <Redes className="footer-social" />
            </div>
          </div>
        </div>

        <div className="pickup">
          <h3 className="pickup-title">Peça seu Doce Sabor</h3>
          <ul className="pickup-list">
            <li>Retirada em {LOJA.endereco.cidade}</li>
            <li>Consulte disponibilidade de entrega</li>
            <li>{LOJA.pagamentos.join(" • ")}</li>
          </ul>
        </div>
      </div>

      <p className="copyright">
        ©2026 Doce Sabor. Desenvolvido e protegido por Patifes
      </p>
    </footer>
  );
}
