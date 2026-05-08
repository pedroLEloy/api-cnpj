import { NextResponse } from 'next/server';
import { fetchOpenCNPJ } from '@/lib/adapters/opencnpj';
import { fetchReceitaWS } from '@/lib/adapters/receitaws';

/**
 * GET /api/cnpj/{cnpj}
 *
 * Fluxo:
 *   1. Tenta OpenCNPJ (100 req/min, dump mensal da Receita).
 *   2. Se OpenCNPJ não tem o CNPJ ou cai, tenta ReceitaWS (3 req/min, dado fresco).
 *   3. Se as duas falham, devolve erro com a razão.
 *
 * O retorno traz `_source: 'opencnpj' | 'receitaws'` para que o cliente
 * exiba qual fonte respondeu — informação importante porque a frescor dos
 * dados difere entre as fontes.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const cnpj = String(params?.cnpj || '').replace(/\D/g, '');
  if (cnpj.length !== 14) {
    return NextResponse.json(
      { status: 'ERROR', message: 'CNPJ inválido (precisa ter 14 dígitos).' },
      { status: 400 }
    );
  }

  // Acumula motivos para devolver uma mensagem útil caso ambas as fontes falhem.
  const reasons = [];

  // ---- 1. Primária: OpenCNPJ ----
  try {
    const r = await fetchOpenCNPJ(cnpj);
    if (r.found) {
      return NextResponse.json(r.data, { status: 200 });
    }
    reasons.push(`OpenCNPJ: ${r.message}`);
  } catch (err) {
    reasons.push(`OpenCNPJ: ${err.message}`);
    // Continua para o fallback. Não diferenciamos rate-limit aqui porque
    // 100/min raramente é problema; se estourar, a fallback resolve.
  }

  // ---- 2. Fallback: ReceitaWS ----
  try {
    const r = await fetchReceitaWS(cnpj);
    if (r.found) {
      return NextResponse.json(r.data, { status: 200 });
    }
    reasons.push(`ReceitaWS: ${r.message}`);
    // Ambas as fontes responderam mas nenhuma encontrou o CNPJ → 404 real.
    return NextResponse.json(
      { status: 'ERROR', message: reasons.join(' · ') },
      { status: 404 }
    );
  } catch (err) {
    reasons.push(`ReceitaWS: ${err.message}`);
    const isRateLimit = err.code === 'RATE_LIMIT';
    return NextResponse.json(
      {
        status: 'ERROR',
        message: isRateLimit
          ? 'CNPJ não está na base OpenCNPJ e a ReceitaWS atingiu o limite (3/min). Tente novamente em ~1 minuto.'
          : reasons.join(' · '),
      },
      { status: isRateLimit ? 429 : 502 }
    );
  }
}
