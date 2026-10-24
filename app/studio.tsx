'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { ArrowLeft, UserStar, Play, Heart, MessageCircle, Forward, Bookmark, Info, ChevronRight, Check } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { defaultProject, projectSchema, type Project } from '@/lib/project';

const ageLabels = ['18 - 24', '25 - 34', '35 - 44', '45 - 54', '55+'];
const projectKey = 'analytics-studio-project-v1';
const EditingContext = createContext(false);
type NumberField = 'duration' | 'views' | 'likes' | 'comments' | 'shares' | 'saves' | 'watchTime' | 'completion' | 'followers' | 'nonFollowers' | 'male' | 'female' | 'other';
type TextField = 'title' | 'date' | 'playTime' | 'totalViewers';

function subscribeProject(update: () => void) {
  window.addEventListener('storage', update);
  window.addEventListener(projectKey, update);
  return () => {
    window.removeEventListener('storage', update);
    window.removeEventListener(projectKey, update);
  };
}
function readProject() {
  try { return window.localStorage?.getItem(projectKey) ?? ''; }
  catch { return ''; }
}
function parseProject(raw: string) {
  try {
    const parsed = projectSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : defaultProject;
  } catch { return defaultProject; }
}
function emptyProject() { return ''; }

function InlineValue({ value, label, onSave, type = 'number', display, step = 1, min = 0, max, className = '' }: {
  value: string | number;
  label: string;
  onSave: (value: string | number) => void;
  type?: 'number' | 'text';
  display?: string;
  step?: number | 'any';
  min?: number;
  max?: number;
  className?: string;
}) {
  const editable = useContext(EditingContext);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const cancel = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    }
  }, [editing]);
  function commit() {
    setEditing(false);
    const next = type === 'number' ? Number(draft) : draft.trim();
    if (type === 'number' && !Number.isFinite(next)) return;
    if (String(next) !== String(value)) onSave(next);
  }
  if (editing && editable) return <input ref={input} className={`inline-input ${className}`} aria-label={label} type={type} min={type === 'number' ? min : undefined} max={type === 'number' ? max : undefined} step={type === 'number' ? step : undefined} value={draft} onChange={e => setDraft(e.target.value)} onBlur={() => { if (cancel.current) { cancel.current = false; return; } commit(); }} onKeyDown={e => {
    if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
    if (e.key === 'Escape') { cancel.current = true; setDraft(String(value)); setEditing(false); }
  }} />;
  if (!editable) return <span className={`inline-value view-value ${className}`}>{display ?? value}</span>;
  return <button type="button" className={`inline-value ${className}`} aria-label={`Edit ${label}: ${display ?? value}`} onClick={e => { e.stopPropagation(); setDraft(String(value)); setEditing(true); }}>{display ?? value}</button>;
}

function Bars({ rows, onEdit }: { rows: { name: string; value: number }[]; onEdit: (index: number, value: number) => void }) {
  return <div className="bar-list">{rows.map((row, index) => <div key={index}><div className="bar-label"><span>{row.name}</span><b><InlineValue value={row.value} label={`${row.name} viewers percentage`} step="any" max={100} onSave={value => onEdit(index, Number(value))} />%</b></div><Progress value={row.value} aria-label={`${row.name}: ${row.value}%`} className="demographic-bar" /></div>)}</div>;
}

export default function Studio() {
  const rawProject = useSyncExternalStore(subscribeProject, readProject, emptyProject);
  const project = useMemo(() => rawProject ? parseProject(rawProject) : defaultProject, [rawProject]);
  const [tab, setTab] = useState('Overview');
  const [editMode, setEditMode] = useState(false);
  const [notice, setNotice] = useState('');
  const [valid, setValid] = useState(true);
  const [busy, setBusy] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function check() {
      try { if (!(await fetch('/api/license')).ok) setValid(false); }
      catch { setValid(false); }
    }
    const timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const context = (document as unknown as { modelContext?: { registerTool: (tool: unknown, options: unknown) => Promise<void> } }).modelContext;
    if (!context) return;
    const controller = new AbortController();
    Promise.resolve(context.registerTool({
      name: 'navigate_analytics_tab',
      description: 'Switch the visible analytics tab.',
      inputSchema: { type: 'object', properties: { tab: { type: 'string', enum: ['Inspiration', 'Overview', 'Viewers', 'Engagement'] } }, required: ['tab'], additionalProperties: false },
      execute: (input: unknown) => {
        const selected = (input as { tab?: string })?.tab;
        if (!valid || !selected || !['Inspiration', 'Overview', 'Viewers', 'Engagement'].includes(selected)) throw new Error('Invalid tab or inactive session.');
        setTab(selected);
        return { tab: selected };
      },
    }, { signal: controller.signal })).catch(() => {});
    return () => controller.abort();
  }, [valid]);

  async function persist(next: Project) {
    const parsed = projectSchema.safeParse(next);
    if (!parsed.success) { setNotice(parsed.error.issues[0].message); return; }
    setBusy(true);
    setNotice('Saving…');
    try {
      if (!(await fetch('/api/license')).ok) { setValid(false); throw new Error('Access expired.'); }
      try { window.localStorage?.setItem(projectKey, JSON.stringify(parsed.data)); }
      catch { throw new Error('Your browser is blocking storage, so edits cannot be saved on this device.'); }
      window.dispatchEvent(new Event(projectKey));
      setNotice('Saved on this device.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Save failed.'); }
    finally { setBusy(false); }
  }

  function editNumber(field: NumberField, value: number) {
    const next = { ...project, [field]: value } as Project;
    if (field === 'male') next.other = 100 - next.male - next.female;
    if (field === 'female') next.other = 100 - next.male - next.female;
    if (field === 'other') next.female = 100 - next.male - next.other;
    void persist(next);
  }
  function editText(field: TextField, value: string) { void persist({ ...project, [field]: value }); }
  function editAge(index: number, value: number) {
    const ages = [...project.ages];
    ages[index] = value;
    const balanceIndex = index === ages.length - 1 ? ages.length - 2 : ages.length - 1;
    ages[balanceIndex] = 100 - ages.reduce((total, age, i) => total + (i === balanceIndex ? 0 : age), 0);
    void persist({ ...project, ages });
  }
  function editLocation(index: number, value: number) {
    const locations = project.locations.map((location, i) => i === index ? { ...location, value } : location);
    void persist({ ...project, locations });
  }
  async function replaceCover(file?: File) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2_000_000) {
      setNotice('Choose a PNG, JPG or WebP smaller than 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { void persist({ ...project, cover: String(reader.result) }); };
    reader.readAsDataURL(file);
  }

  if (!valid) return <main className="activation"><div className="activation-card"><h1>Check your access</h1><p>Your session expired or could not be verified. Re-enter your access code to continue.</p><button className="primary" onClick={() => window.location.reload()}>Continue to activation</button></div></main>;

  return <EditingContext.Provider value={editMode}><main className="phone">
    <header className="app-header">
      <button className="icon-button" aria-label="Back to overview" onClick={() => setTab('Overview')}><ArrowLeft /></button>
      <h1><InlineValue value={project.title} label="Video title" type="text" className="inline-title" onSave={value => editText('title', String(value))} /></h1>
      <button type="button" className={`studio-pill ${editMode ? 'is-editing' : ''}`} aria-label={editMode ? 'Exit edit mode' : 'Enter edit mode'} aria-pressed={editMode} onClick={() => setEditMode(current => !current)}><UserStar size={16} />TikTok Studio</button>
    </header>
    <section className="video-summary">
      <div className="cover-button"><button className="cover-image" disabled={!editMode} onClick={() => coverInput.current?.click()} aria-label="Replace video thumbnail"><Image src={project.cover} alt={project.title} width={100} height={133} unoptimized /></button><span><InlineValue value={project.duration} label="Video duration in seconds" display={`${project.duration}s`} step="any" onSave={value => editNumber('duration', Number(value))} /></span></div>
      <input ref={coverInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { void replaceCover(e.target.files?.[0]); e.target.value = ''; }} />
      <p>Posted on <InlineValue value={project.date} label="Post date" type="text" onSave={value => editText('date', String(value))} /></p>
      <div className="counts">{[Play, Heart, MessageCircle, Forward, Bookmark].map((Icon, index) => <div key={index}><Icon aria-label={['Views', 'Likes', 'Comments', 'Shares', 'Saves'][index]} /><InlineValue value={[project.views, project.likes, project.comments, project.shares, project.saves][index]} label={['Video views', 'Likes', 'Comments', 'Shares', 'Saves'][index]} display={[project.views, project.likes, project.comments, project.shares, project.saves][index].toLocaleString()} onSave={value => editNumber((['views', 'likes', 'comments', 'shares', 'saves'] as NumberField[])[index], Number(value))} /></div>)}</div>
    </section>

    <Tabs value={tab} onValueChange={setTab}>
      <TabsList variant="line" className="analysis-tabs">{['Inspiration', 'Overview', 'Viewers', 'Engagement'].map(item => <TabsTrigger key={item} value={item}>{item}{item === 'Inspiration' && <i className="pink-dot" />}</TabsTrigger>)}</TabsList>
      <TabsContent value="Overview">
        {project.restricted && <div className="notice">Your video is not eligible for recommendation in the For You feed. If you disagree with the content restriction, you can appeal.<ChevronRight size={22} /></div>}
        <section className="panel"><h2>Key metrics <Info /></h2><p className="muted">{editMode ? 'Tap a value to edit it here.' : 'Tap TikTok Studio to edit video details.'}</p>
          <div className="metrics">
            <div className="selected"><span>Video views</span><strong><InlineValue value={project.views} label="Video views" display={Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(project.views)} onSave={value => editNumber('views', Number(value))} /></strong></div>
            <div><span>Total play time</span><strong><InlineValue value={project.playTime} label="Total play time" type="text" onSave={value => editText('playTime', String(value))} /></strong></div>
            <div><span>Average watch time</span><strong><InlineValue value={project.watchTime} label="Average watch time in seconds" display={`${project.watchTime}s`} step="any" onSave={value => editNumber('watchTime', Number(value))} /></strong></div>
            <div><span>Watched full video</span><strong><InlineValue value={project.completion} label="Watched full video percentage" display={`${project.completion}%`} step="any" max={100} onSave={value => editNumber('completion', Number(value))} /></strong></div>
            <div><span>New followers</span><strong><InlineValue value={project.followers} label="New followers" onSave={value => editNumber('followers', Number(value))} /></strong></div>
          </div>
        </section>
      </TabsContent>
      <TabsContent value="Viewers">
        <section className="panel"><h2>Total viewers <Info /></h2><p className="muted viewer-total"><InlineValue value={project.totalViewers} label="Total viewers" type="text" onSave={value => editText('totalViewers', String(value))} /></p></section>
        <section className="panel"><h2>Viewer types <Info /></h2><div className="viewer-placeholder"><div className="split"><b>-%</b><b>-%</b></div><div className="placeholder-bar" /><div className="split"><span>-</span><span>-</span></div></div><div className="split"><b><InlineValue value={project.nonFollowers} label="Non-followers percentage" step="any" max={100} onSave={value => editNumber('nonFollowers', Number(value))} />%</b><b><InlineValue value={100 - project.nonFollowers} label="Followers percentage" onSave={value => editNumber('nonFollowers', 100 - Number(value))} /></b></div><Progress value={project.nonFollowers} aria-label="Non-followers" className="demographic-bar" /><div className="split"><span>Non-followers</span><span>Followers</span></div></section>
        <section className="panel"><h2>Gender</h2><div className="half-chart" role="img" aria-label={`Male ${project.male}%, Female ${project.female}%, Other ${project.other}%`}><div style={{ background: `conic-gradient(from -90deg,#0078d4 0deg ${project.male * 1.8}deg,#78b7e5 ${project.male * 1.8}deg ${(project.male + project.female) * 1.8}deg,#cbe3f5 ${(project.male + project.female) * 1.8}deg 180deg,transparent 180deg)` }} /></div>{[['Male', 'male', project.male, '#0078d4'], ['Female', 'female', project.female, '#78b7e5'], ['Other', 'other', project.other, '#cbe3f5']].map(([label, field, value, color]) => <div className="gender-row" key={String(field)}><i style={{ background: String(color) }} /><strong>{label}</strong><b><InlineValue value={Number(value)} label={`${label} percentage`} step="any" max={100} onSave={next => editNumber(String(field) as NumberField, Number(next))} />%</b></div>)}</section>
        <section className="panel"><h2>Age</h2><Bars rows={ageLabels.map((name, index) => ({ name, value: project.ages[index] }))} onEdit={editAge} /></section>
        <section className="panel"><h2>Locations <Info /></h2><Bars rows={project.locations} onEdit={editLocation} /></section>
      </TabsContent>
      <TabsContent value="Engagement"><section className="panel"><h2>Engagement <Info /></h2><div className="metrics">{[['Likes', 'likes', project.likes], ['Comments', 'comments', project.comments], ['Shares', 'shares', project.shares], ['Saves', 'saves', project.saves]].map(([label, field, value]) => <div key={String(field)}><span>{label}</span><strong><InlineValue value={Number(value)} label={String(label)} onSave={next => editNumber(String(field) as NumberField, Number(next))} /></strong></div>)}</div></section></TabsContent>
      <TabsContent value="Inspiration"><section className="panel"><h2>Inspiration</h2><p className="muted">No inspiration data was included in this video.</p><button className="primary" onClick={() => setTab('Overview')}>View video metrics</button></section></TabsContent>
    </Tabs>
    {!busy && notice && <div className="save-toast" role="status"><Check size={16} />{notice}<button aria-label="Dismiss" onClick={() => setNotice('')}>×</button></div>}
  </main></EditingContext.Provider>;
}
