'use client';

import { useMemo, useState } from 'react';
import { format as formatCnpj } from '@/lib/cnpj';
import { exportToXlsx } from '@/lib/exportXlsx';

export default function ResultsTable({ records, onClear }) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return records;
    return records.filter(r => {
      const haystack = [
        r.cnpj,
        r.data?.nome,
        r.data?.fantasia,
        r.data?.municipio,
        r.data?.uf,
        r.data?.situacao,
        r.error,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [records, filter]);

  const counts = useMemo(() => {
    const ok = records.filter(r => !r.error).length;
    const err = records.length - ok;
    return { ok, err, total: records.length };
  }, [records]);

  const handleExport = () => {
    if (records.length === 0) return;
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    exportToXlsx(records, `consulta-cnpj-${ts}.xlsx`);
  };

  if (records.length === 0) {
    return (
      <div className="border border-dashed border-paper-line bg-paper-warm/40 px-6 py-12 text-center">
        <p className="font-display text-2xl text-ink-muted italic">
          Nenhum resultado ainda.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          As consultas que você realizar aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-5">
        <div>
          <h2 className="font-display text-3xl text-ink leading-none">Resultados</h2>
          <p className="mt-2 text-xs font-mono text-ink-muted">
            <span className="text-ink">{counts.total}</span>
            <span> total · </span>
            <span className="text-signal-ok">{counts.ok}</span>
            <span> ok · </span>
            <span className="text-signal-err">{counts.err}</span>
            <span> com erro</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar..."
            className="field-input min-w-[200px] py-2"
          />
          <button onClick={handleExport} className="btn-accent">
            <DownloadIcon /> Exportar XLSX
          </button>
          <button onClick={onClear} className="btn-ghost">
            Limpar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-paper-line bg-paper">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-paper-line bg-paper-warm">
              <Th>CNPJ</Th>
              <Th>Razão social</Th>
              <Th>Fantasia</Th>
              <Th>Situação</Th>
              <Th>UF</Th>
              <Th>Município</Th>
              <Th>Atividade principal</Th>
              <Th>Abertura</Th>
              <Th>Capital social</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <Row key={`${r.cnpj}-${i}`} record={r} />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-8 text-ink-muted text-sm">
                  Nenhum resultado bate com o filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.15em] font-medium text-ink-muted whitespace-nowrap">
      {children}
    </th>
  );
}

function Row({ record }) {
  const { cnpj, error, data } = record;

  if (error) {
    return (
      <tr className="border-b border-paper-line/60 bg-signal-err/5">
        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{formatCnpj(cnpj)}</td>
        <td className="px-4 py-3 text-signal-err italic" colSpan={8}>
          erro · {error}
        </td>
      </tr>
    );
  }

  const atv = Array.isArray(data?.atividade_principal) && data.atividade_principal[0]
    ? `${data.atividade_principal[0].code} — ${data.atividade_principal[0].text}`
    : '';

  const situacao = (data?.situacao || '').toUpperCase();
  const situacaoClass = situacao === 'ATIVA'
    ? 'text-signal-ok'
    : situacao
      ? 'text-signal-err'
      : 'text-ink-muted';

  return (
    <tr className="border-b border-paper-line/60 hover:bg-paper-warm/50 transition-colors">
      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{formatCnpj(cnpj)}</td>
      <td className="px-4 py-3 text-ink max-w-[280px]">{data?.nome || ''}</td>
      <td className="px-4 py-3 text-ink-muted max-w-[180px] truncate" title={data?.fantasia || ''}>
        {data?.fantasia || ''}
      </td>
      <td className={`px-4 py-3 font-mono text-xs ${situacaoClass}`}>{situacao || '—'}</td>
      <td className="px-4 py-3 font-mono text-xs">{data?.uf || ''}</td>
      <td className="px-4 py-3">{data?.municipio || ''}</td>
      <td className="px-4 py-3 text-ink-muted text-xs max-w-[300px] truncate" title={atv}>{atv}</td>
      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{data?.abertura || ''}</td>
      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-right">
        {formatCapital(data?.capital_social)}
      </td>
    </tr>
  );
}

function formatCapital(val) {
  if (!val) return '';
  const n = Number(val);
  if (Number.isNaN(n)) return val;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M12 4v12m0 0l-5-5m5 5l5-5M4 20h16" />
    </svg>
  );
}
