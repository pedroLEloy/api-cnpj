/**
 * Adapter da OpenCNPJ (fonte primária).
 *
 * Endpoint: https://kitana.opencnpj.com/cnpj/{cnpj}
 * Limite:   100 req/min por IP
 * Fonte:    dumps mensais públicos da Receita Federal
 *
 * Latência de atualização: as alterações na Receita só aparecem aqui após
 * o próximo dump mensal. Para casos onde a frescor importa (situação que
 * mudou recentemente), o roteador faz fallback para a ReceitaWS.
 */

const ENDPOINT = 'https://kitana.opencnpj.com/cnpj';

/**
 * Retorna { found: true, data } ou { found: false, message? }.
 * Lança em erro de rede / 5xx / 429 (chamador faz fallback).
 */
export async function fetchOpenCNPJ(cnpj) {
  const res = await fetch(`${ENDPOINT}/${cnpj}`, {
    headers: { 'Accept': 'application/json' },
    cache: 'no-store',
  });

  if (res.status === 404) {
    return { found: false, message: 'CNPJ não encontrado na base OpenCNPJ.' };
  }
  if (res.status === 429) {
    const err = new Error('Rate limit OpenCNPJ atingido.');
    err.code = 'RATE_LIMIT';
    err.status = 429;
    throw err;
  }
  if (!res.ok) {
    throw new Error(`OpenCNPJ HTTP ${res.status}`);
  }

  const body = await res.json().catch(() => null);
  if (!body || body.success === false || !body.data) {
    return { found: false, message: body?.message || 'Resposta inesperada da OpenCNPJ.' };
  }

  return { found: true, data: normalize(body.data) };
}

function normalize(d) {
  // OpenCNPJ devolve todos os CNAEs num array só, sem distinguir principal.
  // Convencionamos que o primeiro é o principal — bate com a ordem que a
  // Receita publica nos dumps oficiais.
  const cnaes = Array.isArray(d.cnaes) ? d.cnaes : [];
  const [principal, ...secundarias] = cnaes;

  // "matriz" pode vir como string ("Sim"/"Não") ou boolean, dependendo da
  // versão. Normalizamos para "MATRIZ"/"FILIAL".
  const m = d.matriz;
  const isMatriz = m === true || (typeof m === 'string' && m.toLowerCase().startsWith('s'));

  return {
    status: 'OK',
    cnpj: d.cnpj || '',
    nome: d.razaoSocial || '',
    fantasia: d.nomeFantasia || '',
    tipo: isMatriz ? 'MATRIZ' : 'FILIAL',
    porte: '', // OpenCNPJ não expõe porte
    abertura: d.dataInicioAtividades || '',
    natureza_juridica: d.naturezaJuridica || '',
    capital_social: d.capitalSocial != null ? String(d.capitalSocial) : '',
    situacao: d.situacaoCadastral || '',
    data_situacao: d.dataSituacaoCadastral || '',
    motivo_situacao: d.motivoSituacaoCadastral || '',
    situacao_especial: d.situacaoEspecial || '',
    data_situacao_especial: d.dataSituacaoEspecial || '',
    atividade_principal: principal
      ? [{ code: principal.cnae || '', text: principal.descricao || '' }]
      : [],
    atividades_secundarias: secundarias.map(c => ({
      code: c.cnae || '',
      text: c.descricao || '',
    })),
    qsa: Array.isArray(d.socios) ? d.socios.map(s => ({
      nome: s.nomeSocio || '',
      qual: s.descricao || '',
    })) : [],
    email: d.email || '',
    telefone: d.telefone || '',
    logradouro: d.logradouro || '',
    numero: d.numero || '',
    complemento: d.complemento || '',
    bairro: d.bairro || '',
    municipio: d.municipio || '',
    uf: d.uf || '',
    cep: d.cep || '',
    efr: '',
    ultima_atualizacao: '',
    _source: 'opencnpj',
  };
}
