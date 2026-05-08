'use client';

import { useRef, useState } from 'react';
import { analyzeList, format, isValid } from '@/lib/cnpj';
import { RateLimiter, sleep } from '@/lib/rateLimiter';

export default function BulkSearch({ onResult, onBatchStart, onBatchEnd }) {
  const [raw, setRaw] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [waitMs, setWaitMs] = useState(0);
  const [currentCnpj, setCurrentCnpj] = useState('');
  const cancelRef = useRef(false);

  const { valid: list, invalid } = analyzeList(raw);

  const handleStart = async () => {
    if (running || list.length === 0) return;
    cancelRef.current = false;
    setRunning(true);
    setProgress({ done: 0, total: list.length });
    onBatchStart?.();

    const limiter = new RateLimiter({ maxRequests: 100, windowMs: 60_000 });

    for (let i = 0; i < list.length; i++) {
      if (cancelRef.current) break;
      const cnpj = list[i];
      setCurrentCnpj(cnpj);

      // Aguarda slot na janela. O onWait alimenta o contador regressivo da UI.
      await limiter.acquire((ms) => {
        setWaitMs(ms);
        // tick visual
        const start = Date.now();
        const tick = setInterval(() => {
          const remaining = ms - (Date.now() - start);
          if (remaining <= 0 || cancelRef.current) {
            clearInterval(tick);
            setWaitMs(0);
          } else {
            setWaitMs(remaining);
          }
        }, 200);
      });

      if (cancelRef.current) break;

      try {
        const res = await fetch(`/api/cnpj/${cnpj}`);
        const data = await res.json();
        if (!res.ok || data.status === 'ERROR') {
          onResult({ cnpj, error: data.message || `HTTP ${res.status}`, data: null });
        } else {
          onResult({ cnpj, error: null, data });
        }
      } catch (err) {
        onResult({ cnpj, error: `Falha de rede: ${err.message}`, data: null });
      }

      setProgress({ done: i + 1, total: list.length });
    }

    setRunning(false);
    setCurrentCnpj('');
    setWaitMs(0);
    onBatchEnd?.();
  };

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const handleClear = () => {
    if (running) return;
    setRaw('');
  };

  const eta = (() => {
    if (!running) return null;
    const remaining = list.length - progress.done;
    if (remaining <= 0) return null;
    // Em regime estacionário a 100/min, cada chamada custa ~0,6s no rate limiter.
    // Some uma latência média de rede de ~0,3s por chamada para ter folga.
    const seconds = Math.ceil(remaining * 0.9);
    if (seconds <= 0) return null;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return min > 0 ? `~${min}m ${sec}s` : `~${sec}s`;
  })();

  return (
    <div className="card">
      <label htmlFor="cnpj-bulk" className="field-label">
        Lista de CNPJs (cole do Excel ou digite, um por linha)
      </label>
      <textarea
        id="cnpj-bulk"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="00.000.000/0000-00&#10;11.222.333/0001-44&#10;..."
        rows={8}
        disabled={running}
        className="field-input resize-y leading-relaxed"
      />

      {invalid.length > 0 && (
        <div className="mt-4 border-l-4 border-signal-err bg-signal-err/5 px-4 py-4 reveal">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <p className="text-sm text-signal-err font-medium">
              {invalid.length} {invalid.length === 1 ? 'entrada inválida' : 'entradas inválidas'} — {invalid.length === 1 ? 'será ignorada' : 'serão ignoradas'} na consulta
            </p>
            <span className="text-[10px] uppercase tracking-[0.15em] text-ink-muted whitespace-nowrap">
              corrija e re-cole
            </span>
          </div>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {invalid.map((item, i) => (
              <li
                key={`${item.raw}-${i}`}
                className="flex items-baseline gap-3 font-mono text-xs"
              >
                <span className="text-signal-err">✗</span>
                <span className="text-ink truncate" title={item.raw}>
                  {item.digits.length === 14 ? format(item.digits) : item.raw}
                </span>
                <span className="text-ink-muted text-[11px] ml-auto whitespace-nowrap">
                  {item.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
        <Stat label="Válidos" value={list.length} tone="ok" />
        <Stat label="Inválidos" value={invalid.length} tone={invalid.length ? 'err' : 'ok'} />
        <Stat label="Tempo estimado" value={estimateTotalTime(list.length)} />
        <Stat label="Limite API" value="100/min" />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleStart}
          disabled={running || list.length === 0}
          className="btn-primary"
        >
          {running
            ? `Em andamento (${progress.done}/${progress.total})`
            : `Consultar ${list.length} ${list.length === 1 ? 'CNPJ' : 'CNPJs'}`}
        </button>
        {running ? (
          <button type="button" onClick={handleCancel} className="btn-ghost">
            Cancelar
          </button>
        ) : (
          <button type="button" onClick={handleClear} className="btn-ghost" disabled={!raw}>
            Limpar
          </button>
        )}
      </div>

      {running && (
        <div className="mt-6 reveal">
          <ProgressBar done={progress.done} total={progress.total} />
          <div className="mt-3 text-xs font-mono text-ink-muted flex flex-wrap gap-x-6 gap-y-1">
            {currentCnpj && (
              <span>
                <span className="text-ink-muted/70">consultando </span>
                <span className="text-ink">{format(currentCnpj)}</span>
              </span>
            )}
            {waitMs > 0 && (
              <span>
                <span className="text-ink-muted/70">aguardando janela </span>
                <span className="text-signal-warn">{(waitMs / 1000).toFixed(1)}s</span>
              </span>
            )}
            {eta && (
              <span>
                <span className="text-ink-muted/70">restante </span>
                <span className="text-ink">{eta}</span>
              </span>
            )}
          </div>
        </div>
      )}

      <p className="mt-5 text-xs text-ink-muted leading-relaxed">
        A consulta usa <strong className="text-ink">OpenCNPJ</strong> como fonte primária
        (<strong className="text-ink">100/min</strong>, dados do dump mensal da Receita) e cai para
        a <strong className="text-ink">ReceitaWS</strong> (3/min, dado fresco) quando o CNPJ não está
        no dump. Cada linha da tabela mostra qual fonte respondeu.
      </p>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const toneClass = tone === 'warn' ? 'text-signal-warn' : tone === 'err' ? 'text-signal-err' : 'text-ink';
  return (
    <div className="border-l-2 border-paper-line pl-3">
      <div className="uppercase tracking-[0.15em] text-[10px] text-ink-muted mb-1">{label}</div>
      <div className={`text-base ${toneClass}`}>{value}</div>
    </div>
  );
}

function ProgressBar({ done, total }) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  return (
    <div className="w-full">
      <div className="h-1 bg-paper-line relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-ink transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function estimateTotalTime(n) {
  if (n <= 0) return '—';
  if (n <= 30) return '<30s';
  // 100 req/min = janela; com latência média assumimos ~0.9s/CNPJ.
  const seconds = Math.ceil(n * 0.9);
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return min > 0 ? `~${min}m ${sec}s` : `~${sec}s`;
}
