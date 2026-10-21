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
                WhatsApp (47) 99741-7610
                <br />
                Todos os dias, das 10h às 22h
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
            <li>Retirada em Joinville</li>
            <li>Consulte disponibilidade de entrega</li>
            <li>Pix • Cartão • Dinheiro</li>
          </ul>
        </div>
      </div>

      <p className="copyright">
        ©2026 Doce Sabor. Desenvolvido e protegido por <a href="#">Patifes</a>
      </p>
    </footer>
  );
}
