import { describe, expect, it } from "vitest";
import { dadosEstruturados, ENDERECO_LOJA, HORARIO_LOJA, telefoneParaLer } from "./contato";

describe("dados da loja", () => {
  it("formata o WhatsApp para leitura", () => {
    expect(telefoneParaLer("5547997417610")).toBe("(47) 99741-7610");
  });

  it("monta os textos usados na página", () => {
    expect(ENDERECO_LOJA).toBe("Rua do Príncipe, 500 — Centro");
    expect(HORARIO_LOJA).toBe("das 10h às 22h");
  });

  it("gera o bloco Bakery com endereço, telefone e horário", () => {
    const dados = dadosEstruturados();
    expect(dados["@type"]).toBe("Bakery");
    expect(dados.telephone).toBe("+55 47 99741-7610");
    expect(dados.address.postalCode).toBe("89201-000");
    expect(dados.openingHoursSpecification[0]).toMatchObject({ opens: "10:00", closes: "22:00" });
    expect(dados.openingHoursSpecification[0]?.dayOfWeek).toHaveLength(7);
  });
});
