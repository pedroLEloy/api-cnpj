'use client';

import { useState } from 'react';
import { sanitize, format, isValid } from '@/lib/cnpj';

export default function ManualSearch({ onResult }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cnpj = sanitize(input);
    if (!cnpj) {
      setError('Informe um CNPJ.');
      return;
    }
    if (cnpj.length !== 14) {
      setError('O CNPJ deve ter 14 dígitos.');
      return;
    }
    if (!isValid(cnpj)) {
      setError('CNPJ inválido (dígitos verificadores não conferem).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/cnpj/${cnpj}`);
      const data = await res.json();

      if (!res.ok || data.status === 'ERROR') {
        onResult({ cnpj, error: data.message || `HTTP ${res.status}`, data: null });
      } else {
        onResult({ cnpj, error: null, data });
      }
      setInput('');
    } catch (err) {
      setError(`Falha de rede: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Máscara visual enquanto digita.
  const handleChange = (e) => {
    const raw = sanitize(e.target.value).slice(0, 14);
    setInput(raw.length === 14 ? format(raw) : raw);
    if (error) setError('');
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="cnpj-manual" className="field-label">
        CNPJ
      </label>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          id="cnpj-manual"
          type="text"
          value={input}
          onChange={handleChange}
          placeholder="00.000.000/0000-00"
          className="field-input flex-1"
          autoComplete="off"
          disabled={loading}
        />
        <button type="submit" className="btn-primary sm:min-w-[140px]" disabled={loading}>
          {loading ? (
            <>
              <span className="pulse-dot">●</span>
              Consultando
            </>
          ) : (
            'Consultar'
          )}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-sm text-signal-err font-mono">→ {error}</p>
      )}
      <p className="mt-4 text-xs text-ink-muted">
        Aceita CNPJ com ou sem máscara. Valida dígitos verificadores antes de chamar a API.
      </p>
    </form>
  );
}
