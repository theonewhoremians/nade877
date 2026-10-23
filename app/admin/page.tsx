'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  LockKeyhole,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  TimerReset,
  XCircle,
} from 'lucide-react';

type License = {
  access_code: string;
  plan: string;
  active: boolean;
  expires_at: string | null;
  duration_days: number | null;
  device_id: string | null;
};

type AdminAction = 'list' | 'create' | 'enable' | 'disable' | 'extend' | 'reset';
type Notice = { kind: 'success' | 'error'; message: string };
type AdminResponse = { error?: string; license?: License; licenses?: License[] };

function expiryLabel(license: License) {
  if (license.expires_at) {
    return `Expires ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(license.expires_at))}`;
  }
  return license.duration_days ? `${license.duration_days} days after activation` : 'Lifetime access';
}

export default function Admin() {
  const [key, setKey] = useState('');
  const [keyVisible, setKeyVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<License[]>([]);
  const [duration, setDuration] = useState('30');
  const [plan, setPlan] = useState('Premium');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [latestCode, setLatestCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [connected, setConnected] = useState(false);

  async function request(action: AdminAction, body: Record<string, unknown> = {}) {
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, action, body }),
    });
    const result = (await response.json()) as AdminResponse;
    if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
    return result;
  }

  async function run(action: AdminAction, accessCode?: string) {
    if (!key.trim()) {
      setNotice({ kind: 'error', message: 'Enter your admin key to continue.' });
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      const body = action === 'create'
        ? { plan: plan.trim(), durationDays: duration === 'lifetime' ? null : Number(duration) }
        : { query, accessCode, days: 30 };
      const result = await request(action, body);

      if (action === 'list') {
        setRows(result.licenses || []);
        setLoaded(true);
        setConnected(true);
        return;
      }

      if (action === 'create' && result.license?.access_code) {
        setLatestCode(result.license.access_code);
        setNotice({ kind: 'success', message: 'Access code created. Copy it and share it with its owner.' });
      } else {
        setNotice({ kind: 'success', message: action === 'reset' ? 'Device link reset.' : 'Access code updated.' });
      }

      const refreshed = await request('list', { query });
      setRows(refreshed.licenses || []);
      setLoaded(true);
      setConnected(true);
    } catch (cause) {
      setNotice({ kind: 'error', message: cause instanceof Error ? cause.message : 'The request could not be completed.' });
      if (action === 'list') {
        setRows([]);
        setLoaded(false);
        setConnected(false);
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyCode(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice({ kind: 'success', message: 'Access code copied to clipboard.' });
    } catch {
      setNotice({ kind: 'error', message: 'Clipboard access is unavailable. Select the code to copy it.' });
    }
  }

  function lockDashboard() {
    setKey('');
    setRows([]);
    setLatestCode('');
    setLoaded(false);
    setConnected(false);
    setNotice(null);
  }

  const activeCount = rows.filter((license) => license.active).length;
  const inactiveCount = rows.length - activeCount;

  return (
    <main className="admin admin-dashboard">
      <Link className="admin-back-link" href="/"><ArrowLeft size={16} /> Analytics Studio</Link>

      <header className="admin-header">
        <p className="admin-eyebrow"><ShieldCheck size={14} /> CONTROL CENTER</p>
        <h1>License manager</h1>
        <p>Create access codes, track activations, and manage devices from one place.</p>
      </header>

      <section className={`admin-auth-card${connected ? ' is-connected' : ''}`} aria-label="Admin access">
        {!connected ? (
          <form onSubmit={(event) => { event.preventDefault(); void run('list'); }}>
            <div className="admin-auth-heading">
              <span className="admin-auth-icon"><LockKeyhole size={19} /></span>
              <div><h2>Admin access</h2><p>Your key stays in this browser session.</p></div>
            </div>
            <label className="admin-field" htmlFor="admin-key">
              <span>Admin key</span>
              <span className="admin-secret-field">
                <input
                  id="admin-key"
                  type={keyVisible ? 'text' : 'password'}
                  autoComplete="off"
                  value={key}
                  onChange={(event) => {
                    setKey(event.target.value);
                    setRows([]);
                    setLoaded(false);
                    setConnected(false);
                    setNotice(null);
                  }}
                  placeholder="Paste your admin key"
                />
                <button className="admin-reveal" type="button" onClick={() => setKeyVisible(!keyVisible)} aria-label={keyVisible ? 'Hide admin key' : 'Show admin key'}>
                  {keyVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            <button className="admin-primary" type="submit" disabled={busy || key.length < 24}>
              {busy ? <RefreshCw className="admin-spin" size={17} /> : <ShieldCheck size={17} />}
              {busy ? 'Checking key…' : 'Unlock dashboard'}
              {!busy && <ArrowRight size={17} />}
            </button>
            <p className="admin-auth-footnote"><LockKeyhole size={13} /> Protected by your private admin key</p>
          </form>
        ) : (
          <div className="admin-connected-row">
            <span className="admin-connected-icon"><CircleCheck size={20} /></span>
            <div><strong>Dashboard unlocked</strong><span>Your access codes are ready to manage.</span></div>
            <button className="admin-lock-button" type="button" onClick={lockDashboard} aria-label="Lock dashboard"><LogOut size={16} /><span>Lock</span></button>
          </div>
        )}
      </section>

      {connected && (
        <>
          <section className="admin-stats" aria-label="Access code summary">
            <div className="admin-stat-card"><span className="admin-stat-icon"><KeyRound size={16} /></span><strong>{rows.length}</strong><span>Showing</span></div>
            <div className="admin-stat-card"><span className="admin-stat-icon is-green"><CircleCheck size={16} /></span><strong>{activeCount}</strong><span>Active</span></div>
            <div className="admin-stat-card"><span className="admin-stat-icon is-muted"><XCircle size={16} /></span><strong>{inactiveCount}</strong><span>Disabled</span></div>
          </section>

          <section className="admin-panel admin-create-panel">
            <div className="admin-section-heading">
              <span className="admin-section-icon"><Plus size={18} /></span>
              <div><h2>Create an access code</h2><p>Choose a plan and how long it lasts.</p></div>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); void run('create'); }}>
              <div className="admin-create-fields">
                <label className="admin-field" htmlFor="license-plan"><span>Plan name</span><input id="license-plan" value={plan} onChange={(event) => setPlan(event.target.value)} placeholder="Premium" /></label>
                <label className="admin-field" htmlFor="license-duration">
                  <span>Access duration</span>
                  <select id="license-duration" value={duration} onChange={(event) => setDuration(event.target.value)}>
                    {['7', '30', '90', '180', '365', 'lifetime'].map((days) => <option value={days} key={days}>{days === 'lifetime' ? 'Lifetime' : `${days} days`}</option>)}
                  </select>
                </label>
              </div>
              <button className="admin-primary" type="submit" disabled={busy || !plan.trim()}>
                {busy ? <RefreshCw className="admin-spin" size={17} /> : <Plus size={18} />}
                {busy ? 'Working…' : 'Generate access code'}
              </button>
            </form>
          </section>

          {latestCode && (
            <section className="admin-new-code" aria-label="New access code">
              <div className="admin-new-code-heading"><span><Check size={16} /></span><div><strong>Your new code is ready</strong><small>Copy it now and send it to its owner.</small></div></div>
              <div className="admin-new-code-value"><code>{latestCode}</code><button type="button" onClick={() => void copyCode(latestCode)} aria-label="Copy new access code"><Copy size={17} /></button></div>
            </section>
          )}

          {notice && <p className={`admin-notice is-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.kind === 'success' ? <CircleCheck size={16} /> : <XCircle size={16} />}{notice.message}</p>}

          <section className="admin-codes-section">
            <div className="admin-codes-title"><div><h2>Access codes</h2><p>{loaded ? `${rows.length} ${rows.length === 1 ? 'code' : 'codes'} loaded` : 'Search and manage your codes'}</p></div><span className="admin-codes-count">{rows.length}</span></div>
            <form className="admin-search" onSubmit={(event) => { event.preventDefault(); void run('list'); }}>
              <Search size={17} aria-hidden="true" />
              <input aria-label="Search access codes" placeholder="Search by access code" value={query} onChange={(event) => setQuery(event.target.value.toUpperCase())} />
              <button type="submit" disabled={busy} aria-label="Search codes"><ArrowRight size={17} /></button>
            </form>

            {!loaded ? (
              <div className="admin-empty"><span><Search size={20} /></span><strong>Load your codes</strong><p>Unlock the dashboard to see and manage your access codes.</p></div>
            ) : rows.length === 0 ? (
              <div className="admin-empty"><span><KeyRound size={20} /></span><strong>No codes found</strong><p>Try another search or create a new access code above.</p></div>
            ) : (
              <div className="admin-license-list">
                {rows.map((license) => (
                  <article className="admin-license-card" key={license.access_code}>
                    <div className="admin-license-top">
                      <div className="admin-license-code"><code>{license.access_code}</code><button type="button" onClick={() => void copyCode(license.access_code)} aria-label={`Copy ${license.access_code}`}><Copy size={15} /></button></div>
                      <span className={`admin-status${license.active ? ' is-active' : ' is-disabled'}`}>{license.active ? 'Active' : 'Disabled'}</span>
                    </div>
                    <div className="admin-license-details">
                      <span><strong>Plan</strong>{license.plan}</span>
                      <span><strong>Duration</strong>{expiryLabel(license)}</span>
                      <span><strong>Device</strong>{license.device_id ? 'Linked' : 'Not activated'}</span>
                    </div>
                    <div className="admin-license-actions">
                      <button type="button" disabled={busy} onClick={() => void run(license.active ? 'disable' : 'enable', license.access_code)}>{license.active ? <XCircle size={14} /> : <CircleCheck size={14} />}{license.active ? 'Disable' : 'Enable'}</button>
                      <button type="button" disabled={busy} onClick={() => void run('extend', license.access_code)}><Plus size={14} />Add 30 days</button>
                      <button type="button" disabled={busy} onClick={() => { if (window.confirm('Reset this code’s device link? The current device will need to activate again.')) void run('reset', license.access_code); }}><TimerReset size={14} />Reset device</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {!connected && notice && <p className={`admin-notice is-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.kind === 'success' ? <CircleCheck size={16} /> : <XCircle size={16} />}{notice.message}</p>}
      <footer className="admin-footer"><Link href="/"><ArrowLeft size={14} /> Back to Analytics Studio</Link><span><Link2 size={13} /> Supabase secured</span></footer>
    </main>
  );
}
