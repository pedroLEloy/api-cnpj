/**
 * Adapter da ReceitaWS (fallback).
 *
 * Endpoint: https://receitaws.com.br/v1/cnpj/{cnpj}
 * Limite:   3 req/min no plano gratuito (token Bearer aumenta no plano pago)
 * Fonte:    consulta direta no site da Receita Federal
 *
 * Como a ReceitaWS é mais cara em termos de rate limit, ela só é chamada
 * quando a OpenCNPJ não tem o CNPJ ou está fora do ar.
 */

const ENDPOINT = 'https://receitaws.com.br/v1/cnpj';

export async function fetchReceitaWS(cnpj) {
  const headers = { 'Accept': 'application/json' };
  if (process.env.RECEITAWS_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.RECEITAWS_TOKEN}`;
  }

  const res = await fetch(`${ENDPOINT}/${cnpj}`, { headers, cache: 'no-store' });

  if (res.status === 429) {
    const err = new Error('Rate limit ReceitaWS atingido. Aguarde um minuto.');
    err.code = 'RATE_LIMIT';
    err.status = 429;
    throw err;
  }
  if (!res.ok && res.status !== 404) {
    throw new Error(`ReceitaWS HTTP ${res.status}`);
  }

  const body = await res.json().catch(() => null);
  if (!body) {
    throw new Error(`ReceitaWS retornou resposta inválida.`);
  }

  if (body.status === 'ERROR') {
    return { found: false, message: body.message || 'CNPJ não encontrado na ReceitaWS.' };
  }

  return { found: true, data: normalize(body) };
}

function normalize(d) {
  return {
    status: 'OK',
    cnpj: d.cnpj || '',
    nome: d.nome || '',
    fantasia: d.fantasia || '',
    tipo: d.tipo || '',
    porte: d.porte || '',
    abertura: d.abertura || '',
    natureza_juridica: d.natureza_juridica || '',
    capital_social: d.capital_social != null ? String(d.capital_social) : '',
    situacao: d.situacao || '',
    data_situacao: d.data_situacao || '',
    motivo_situacao: d.motivo_situacao || '',
    situacao_especial: d.situacao_especial || '',
    data_situacao_especial: d.data_situacao_especial || '',
    atividade_principal: Array.isArray(d.atividade_principal) ? d.atividade_principal : [],
    atividades_secundarias: Array.isArray(d.atividades_secundarias) ? d.atividades_secundarias : [],
    qsa: Array.isArray(d.qsa) ? d.qsa : [],
    email: d.email || '',
    telefone: d.telefone || '',
    logradouro: d.logradouro || '',
    numero: d.numero || '',
    complemento: d.complemento || '',
    bairro: d.bairro || '',
    municipio: d.municipio || '',
    uf: d.uf || '',
    cep: d.cep || '',
    efr: d.efr || '',
    ultima_atualizacao: d.ultima_atualizacao || '',
    _source: 'receitaws',
  };
}
