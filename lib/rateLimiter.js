/**
 * Janela deslizante para respeitar o limite gratuito da ReceitaWS:
 * 3 requisições por minuto.
 *
 * Implementação: mantemos uma lista com os timestamps das últimas N execuções.
 * Antes de cada nova chamada, removemos os timestamps mais antigos que a
 * janela (60s) e, se ainda há N na janela, esperamos até o mais antigo
 * "expirar". Isso é mais justo que um delay fixo entre chamadas — se sobrar
 * folga na janela, a próxima sai imediatamente.
 */
export class RateLimiter {
  constructor({ maxRequests = 3, windowMs = 60_000, safetyBufferMs = 1_000 } = {}) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.safetyBufferMs = safetyBufferMs;
    this.timestamps = [];
  }

  async acquire(onWait) {
    while (true) {
      const now = Date.now();
      this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
      if (this.timestamps.length < this.maxRequests) {
        this.timestamps.push(now);
        return;
      }
      const oldest = this.timestamps[0];
      const waitMs = (oldest + this.windowMs) - now + this.safetyBufferMs;
      if (typeof onWait === 'function') onWait(waitMs);
      await sleep(waitMs);
    }
  }
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
