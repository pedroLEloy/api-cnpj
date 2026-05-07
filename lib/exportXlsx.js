import * as XLSX from 'xlsx';
import { format as formatCnpj } from './cnpj';

/**
 * Achata uma resposta da ReceitaWS em uma linha de planilha.
 * Mantemos só campos úteis para análise; os QSAs e atividades secundárias
 * viram strings concatenadas para caber em uma única célula.
 */
export function flattenForSheet(record) {
  const r = record?.data || {};
  const error = record?.error;

  const atvPrincipal = Array.isArray(r.atividade_principal) && r.atividade_principal[0]
    ? `${r.atividade_principal[0].code} - ${r.atividade_principal[0].text}`
    : '';

  const atvSecundarias = Array.isArray(r.atividades_secundarias)
    ? r.atividades_secundarias
        .filter(a => a && a.code && a.code !== '00.00-0-00')
        .map(a => `${a.code} - ${a.text}`)
        .join(' | ')
    : '';

  const qsa = Array.isArray(r.qsa)
    ? r.qsa.map(s => `${s.nome} (${s.qual})`).join(' | ')
    : '';

  return {
    'CNPJ': formatCnpj(record.cnpj),
    'Status': error ? 'ERRO' : (r.situacao || ''),
    'Mensagem de erro': error || '',
    'Razão social': r.nome || '',
    'Nome fantasia': r.fantasia || '',
    'Tipo': r.tipo || '',
    'Porte': r.porte || '',
    'Natureza jurídica': r.natureza_juridica || '',
    'Abertura': r.abertura || '',
    'Capital social': r.capital_social || '',
    'Atividade principal': atvPrincipal,
    'Atividades secundárias': atvSecundarias,
    'Logradouro': r.logradouro || '',
    'Número': r.numero || '',
    'Complemento': r.complemento || '',
    'Bairro': r.bairro || '',
    'Município': r.municipio || '',
    'UF': r.uf || '',
    'CEP': r.cep || '',
    'Telefone': r.telefone || '',
    'Email': r.email || '',
    'Data situação': r.data_situacao || '',
    'Motivo situação': r.motivo_situacao || '',
    'Situação especial': r.situacao_especial || '',
    'EFR': r.efr || '',
    'QSA': qsa,
    'Última atualização': r.ultima_atualizacao || '',
  };
}

export function exportToXlsx(records, filename = 'consulta-cnpj.xlsx') {
  const rows = records.map(flattenForSheet);
  const ws = XLSX.utils.json_to_sheet(rows);

  // Ajusta largura das colunas com base no conteúdo (cap em 60).
  const headers = Object.keys(rows[0] || {});
  ws['!cols'] = headers.map(h => {
    const max = rows.reduce((acc, row) => {
      const v = row[h] == null ? '' : String(row[h]);
      return Math.max(acc, v.length);
    }, h.length);
    return { wch: Math.min(Math.max(max + 2, 12), 60) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Consulta CNPJ');
  XLSX.writeFile(wb, filename);
}
