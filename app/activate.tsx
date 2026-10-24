'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Check, KeyRound, Music2, ShieldCheck } from 'lucide-react';

export default function Activate() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch('/api/license', { cache: 'no-store' })
      .then((response) => {
        if (active && response.ok) window.location.reload();
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function activate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      let deviceId = localStorage.getItem('editflow-device-id');
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('editflow-device-id', deviceId);
      }

      const response = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: code, deviceId }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Unable to activate this code.');
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to activate your code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="activation">
      <section className="activation-card" aria-labelledby="activation-title">
        <header className="activation-brand">
          <div className="activation-brand-mark"><Music2 size={21} strokeWidth={2.4} /></div>
          <div className="activation-brand-copy">
            <span>CREATOR TOOLS</span>
            <strong>Analytics Studio</strong>
          </div>
          <button
            className="activation-private"
            type="button"
            aria-label="Private badge. Double-click to open admin panel."
            title="Double-click to open admin panel"
            onDoubleClick={() => window.location.assign('/admin')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                window.location.assign('/admin');
              }
            }}
          ><ShieldCheck size={14} /> PRIVATE</button>
        </header>

        <div className="activation-heading">
          <p className="activation-eyebrow">YOUR WORKSPACE IS READY</p>
          <h1 id="activation-title">Unlock your studio</h1>
        </div>

        <form className="activation-form" onSubmit={activate}>
          <label htmlFor="code">Access code</label>
          <div className="activation-code-field">
            <KeyRound size={18} aria-hidden="true" />
            <input
              id="code"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="XXXX-XXXX-XXXX"
              value={code}
              maxLength={14}
              onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12).match(/.{1,4}/g)?.join('-') || '')}
              aria-describedby={error ? 'activation-error' : 'activation-hint'}
              required
            />
            {code.length === 14 && <Check className="activation-code-check" size={18} aria-label="Code format complete" />}
          </div>
          <div className="activation-field-meta">
            <span id="activation-hint">12 characters, including dashes</span>
            <span>{code.length}/14</span>
          </div>
          <button className="activation-submit" disabled={busy || code.length !== 14} type="submit">
            {busy ? 'Activating your workspace…' : 'Continue to studio'}
            <ArrowRight size={18} />
          </button>
          {error && <p id="activation-error" role="alert" className="activation-error">{error}</p>}
        </form>

      </section>
    </main>
  );
}
