import { NextResponse } from 'next/server';

/**
 * GET /api/cnpj/{cnpj}
 *
 * Faz proxy para https://receitaws.com.br/v1/cnpj/{cnpj}.
 * Existe por dois motivos:
 *   1) Resolve CORS — a ReceitaWS não permite chamadas diretas do browser.
 *   2) Centraliza tratamento de erros e (no futuro) injeção de token pago.
 *
 * Roda como serverless function no Vercel.
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

  const headers = { 'Accept': 'application/json' };
  if (process.env.RECEITAWS_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.RECEITAWS_TOKEN}`;
  }

  try {
    const upstream = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
      headers,
      cache: 'no-store',
    });

    // 429: estouramos o limite. Repassamos para o cliente lidar.
    if (upstream.status === 429) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Limite de requisições atingido na ReceitaWS. Aguarde um minuto e tente novamente.' },
        { status: 429 }
      );
    }

    const body = await upstream.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { status: 'ERROR', message: `Resposta inválida da ReceitaWS (HTTP ${upstream.status}).` },
        { status: 502 }
      );
    }

    return NextResponse.json(body, { status: upstream.ok ? 200 : upstream.status });
  } catch (err) {
    return NextResponse.json(
      { status: 'ERROR', message: `Falha ao consultar ReceitaWS: ${err.message}` },
      { status: 502 }
    );
  }
}
