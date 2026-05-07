/**
 * Utilitários para CNPJ:
 *  - sanitize: remove tudo que não é dígito
 *  - format:   aplica máscara 00.000.000/0000-00
 *  - isValid:  valida dígitos verificadores
 *  - parseList: extrai uma lista de CNPJs de um texto colado (Excel, CSV, etc.)
 */

export function sanitize(cnpj) {
  return String(cnpj || '').replace(/\D/g, '');
}

export function format(cnpj) {
  const c = sanitize(cnpj).padStart(14, '0').slice(0, 14);
  if (c.length !== 14) return cnpj;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12, 14)}`;
}

export function isValid(cnpj) {
  const c = sanitize(cnpj);
  if (c.length !== 14) return false;
  if (/^(\d)\1+$/.test(c)) return false; // todos iguais

  const calc = (base) => {
    const weights = base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += parseInt(base[i], 10) * weights[i];
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };

  const d1 = calc(c.slice(0, 12));
  const d2 = calc(c.slice(0, 12) + d1);
  return d1 === parseInt(c[12], 10) && d2 === parseInt(c[13], 10);
}

/**
 * Recebe um texto bruto (ex.: cole de Excel) e devolve uma lista de CNPJs
 * únicos, na ordem original. Aceita um por linha, separado por vírgula,
 * tab, ponto-e-vírgula ou espaço. Mantém apenas os que têm 14 dígitos.
 */
export function parseList(raw) {
  if (!raw) return [];
  const tokens = String(raw).split(/[\s,;]+/).map(sanitize).filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const t of tokens) {
    if (t.length !== 14) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}
