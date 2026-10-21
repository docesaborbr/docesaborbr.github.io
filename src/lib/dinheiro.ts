export const emReais = (valor: number): string => "R$ " + valor.toFixed(2).replace(".", ",");
