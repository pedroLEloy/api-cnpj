'use client';

import { useCallback, useState } from 'react';
import ManualSearch from './components/ManualSearch';
import BulkSearch from './components/BulkSearch';
import ResultsTable from './components/ResultsTable';

export default function Page() {
  const [tab, setTab] = useState('manual');
  const [records, setRecords] = useState([]);

  // Adiciona o resultado no topo (mais recentes primeiro). Se o CNPJ já existe,
  // substitui — assim re-consultar não duplica.
  const handleResult = useCallback((rec) => {
    setRecords(prev => {
      const filtered = prev.filter(r => r.cnpj !== rec.cnpj);
      return [{ ...rec, _at: Date.now() }, ...filtered];
    });
  }, []);

  const handleClear = useCallback(() => setRecords([]), []);

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-paper-line/80">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10 sm:py-14">
          <div className="flex items-baseline gap-4">
            <span className="font-mono text-xs tracking-[0.25em] text-ink-muted uppercase">
              ReceitaWS · v1
            </span>
            <span className="h-px flex-1 bg-paper-line" />
            <span className="font-mono text-[10px] text-ink-muted">
              {new Date().getFullYear()}
            </span>
          </div>
          <h1 className="mt-4 font-display text-5xl sm:text-6xl leading-[0.95] text-ink">
            Consulta <em className="text-accent">CNPJ</em>
          </h1>
          <p className="mt-4 max-w-xl text-ink-muted leading-relaxed">
            Consulta individual ou em lote de cadastros na Receita Federal,
            com respeito automático ao limite de 3 requisições por minuto e
            exportação direta para planilha.
          </p>
        </div>
      </header>

      {/* Tabs + conteúdo */}
      <section className="max-w-6xl mx-auto px-6 sm:px-10 py-10">
        <div className="flex border-b border-paper-line mb-8" role="tablist">
          <button
            onClick={() => setTab('manual')}
            className={`tab-btn ${tab === 'manual' ? 'tab-btn-active' : ''}`}
            role="tab"
            aria-selected={tab === 'manual'}
          >
            <span className="font-mono text-xs text-ink-muted/70 mr-2">01</span>
            Manual
          </button>
          <button
            onClick={() => setTab('bulk')}
            className={`tab-btn ${tab === 'bulk' ? 'tab-btn-active' : ''}`}
            role="tab"
            aria-selected={tab === 'bulk'}
          >
            <span className="font-mono text-xs text-ink-muted/70 mr-2">02</span>
            Em lote
          </button>
        </div>

        <div className="reveal">
          {tab === 'manual' ? (
            <ManualSearch onResult={handleResult} />
          ) : (
            <BulkSearch onResult={handleResult} />
          )}
        </div>
      </section>

      {/* Tabela */}
      <section className="max-w-6xl mx-auto px-6 sm:px-10 pb-20">
        <ResultsTable records={records} onClear={handleClear} />
      </section>

      <footer className="border-t border-paper-line">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-6 text-xs font-mono text-ink-muted flex flex-wrap gap-x-6 gap-y-2 justify-between">
          <span>
            Dados oficiais: <a href="https://receitaws.com.br/api" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">receitaws.com.br</a>
          </span>
          <span>Tier gratuito · 3 req/min</span>
        </div>
      </footer>
    </main>
  );
}
