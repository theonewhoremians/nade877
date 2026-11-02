'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, KeyRound, Music2, ShieldCheck } from 'lucide-react';

export default function Activate() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const hasInteracted = useRef(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch('/api/license', { cache: 'no-store' });
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        if (!active) return;
        if (response.ok) {
          window.location.reload();
          return;
        }
        if (result.error && result.error !== 'Please activate your access code.' && !hasInteracted.current) {
          setError(result.error);
        }
      } catch {
        if (active && !hasInteracted.current) {
          setError('Unable to check your saved access code. Check your connection and try again.');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function activate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    hasInteracted.current = true;
    setBusy(true);
    setError('');
    try {
      let deviceId: string | null = null;
      try {
        deviceId = window.localStorage?.getItem('editflow-device-id') ?? null;
      } catch {
        // Some mobile browsers disable storage in private or restricted contexts.
      }
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        try {
          window.localStorage?.setItem('editflow-device-id', deviceId);
        } catch {
          // Activation can still continue; the server stores the session in secure cookies.
        }
      }

      const response = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: code, deviceId }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || 'Unable to activate this code.');

      const verification = await fetch('/api/license', { cache: 'no-store' });
      const verificationResult = (await verification.json().catch(() => null)) as { error?: string } | null;
      if (!verification.ok) {
        throw new Error(verificationResult?.error || 'Your code was accepted, but your studio session could not be verified. Please try again.');
      }
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
              onChange={(event) => {
                hasInteracted.current = true;
                setError('');
                setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12).match(/.{1,4}/g)?.join('-') || '');
              }}
              aria-invalid={Boolean(error)}
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
