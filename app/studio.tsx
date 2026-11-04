'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, Play, Heart, MessageCircleMore, Bookmark, Info, Check, ChevronRight } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { defaultProject, projectSchema, type Project } from '@/lib/project';

const ageLabels = ['18 - 24', '25 - 34', '35 - 44', '45 - 54', '55+'];
const projectKey = 'analytics-studio-project-v1';
const EditingContext = createContext(false);
type NumberField = 'duration' | 'views' | 'likes' | 'comments' | 'shares' | 'saves' | 'watchTime' | 'completion' | 'averageRetention' | 'followers' | 'viewerChange' | 'viewerPeriodDays' | 'newViewers' | 'nonFollowers' | 'male' | 'female' | 'other';
type TrendField = 'viewTrend' | 'retentionTrend' | 'likesTrend';
type AxisField = 'viewXAxis' | 'viewYAxis' | 'retentionXAxis' | 'retentionYAxis' | 'likesXAxis' | 'likesYAxis';
type TextField = 'title' | 'date' | 'playTime' | 'totalViewers';

function StudioBadgeIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="6" cy="5.2" r="3" /><path d="M.9 17.1v-1.3a5.1 5.1 0 0 1 10.2 0v1.3z" /><path d="m14.5 1.1.9 2 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.5 2.1-.3z" /></svg>;
}

function ShareMetricIcon({ label }: { label: string }) {
  return <svg viewBox="0 0 24 24" role="img" aria-label={label} focusable="false"><path d="M14 3.5 22.2 12 14 20.5v-5.1c-5-.1-8.2 1.4-10.5 5.1.5-7.5 4.1-11.2 10.5-11.5z" /></svg>;
}

function readProject() {
  try { return window.localStorage?.getItem(projectKey) ?? ''; }
  catch { return ''; }
}
function useSavedProject() {
  const [snapshot, setSnapshot] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setSnapshot(readProject());
    update();
    window.addEventListener('storage', update);
    window.addEventListener(projectKey, update);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener(projectKey, update);
    };
  }, []);
  return snapshot;
}
function parseProject(raw: string) {
  try {
    const parsed = projectSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : defaultProject;
  } catch { return defaultProject; }
}
function InlineValue({ value, label, onSave, type = 'number', display, step = 1, min = 0, max, className = '', staticMode = false }: {
  value: string | number;
  label: string;
  onSave: (value: string | number) => void;
  type?: 'number' | 'text';
  display?: string;
  step?: number | 'any';
  min?: number;
  max?: number;
  className?: string;
  staticMode?: boolean;
}) {
  const editable = useContext(EditingContext);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const cancel = useRef(false);
  const input = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (editing) {
      input.current?.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      if (input.current) {
        range.selectNodeContents(input.current);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }, [editing]);
  function commit() {
    setEditing(false);
    const nextDraft = input.current?.textContent ?? draft;
    window.getSelection()?.removeAllRanges();
    const next = type === 'number' ? Number(nextDraft) : nextDraft.trim();
    if (type === 'number' && !Number.isFinite(next)) return;
    if (String(next) !== String(value)) onSave(next);
  }
  function beginEdit() {
    setDraft(String(value));
    setEditing(true);
  }
  if (editing && editable) return <span ref={input} className={`inline-input ${className}`} role="textbox" aria-label={label} aria-multiline="false" contentEditable suppressContentEditableWarning spellCheck={false} inputMode={type === 'number' ? 'decimal' : 'text'} onInput={e => setDraft(e.currentTarget.textContent ?? '')} onBlur={() => { if (cancel.current) { cancel.current = false; return; } commit(); }} onKeyDown={e => {
    if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
    if (e.key === 'Escape') { cancel.current = true; setDraft(String(value)); window.getSelection()?.removeAllRanges(); setEditing(false); }
  }}>{draft}</span>;
  if (!editable) return <span className={`inline-value view-value ${className}`}>{display ?? value}</span>;
  if (staticMode) return <span role="button" tabIndex={0} className={`inline-value edit-value ${className}`} aria-label={`Edit ${label}: ${display ?? value}`} onClick={e => { e.stopPropagation(); beginEdit(); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); beginEdit(); } }}>{display ?? value}</span>;
  return <button type="button" className={`inline-value ${className}`} aria-label={`Edit ${label}: ${display ?? value}`} onClick={e => { e.stopPropagation(); beginEdit(); }}>{display ?? value}</button>;
}

function Bars({ rows, onEdit }: { rows: { name: string; value: number }[]; onEdit: (index: number, value: number) => void }) {
  return <div className="bar-list">{rows.map((row, index) => <div key={index}><div className="bar-label"><span>{row.name}</span><b><InlineValue value={row.value} label={`${row.name} viewers percentage`} step="any" max={100} onSave={value => onEdit(index, Number(value))} />%</b></div><Progress value={row.value} aria-label={`${row.name}: ${row.value}%`} className="demographic-bar" /></div>)}</div>;
}

function AnalyticsBars({ rows, onEdit }: { rows: { name: string; value: number }[]; onEdit: (index: number, value: number) => void }) {
  return <div className="analytics-bars">{rows.map((row, index) => <div className="analytics-bar-row" key={row.name}><div><span>{row.name}</span><strong><InlineValue value={row.value} display={row.value.toFixed(1)} label={`${row.name} percentage`} step="any" max={100} staticMode onSave={value => onEdit(index, Number(value))} />%</strong></div><Progress value={row.value} aria-label={`${row.name}: ${row.value}%`} className="demographic-bar" /></div>)}</div>;
}

type GraphAxisTick = { text: string; x: number; y?: number; axis: 'x' | 'y'; index: number; anchor?: 'start' | 'end'; width?: number };

function EditableTrendGraph({ values, maxValue, editMode, onChange, className, label, width, height, plot, gridLevels = [], axisLabels = [], bottomLabels = [], bottomLabelsEditOnly = false, onAxisEdit, smooth = false, area = false, highlightIndex = -1 }: {
  values: number[];
  maxValue: number;
  editMode: boolean;
  onChange: (values: number[]) => void;
  className: string;
  label: string;
  width: number;
  height: number;
  plot: { left: number; right: number; top: number; bottom: number };
  gridLevels?: number[];
  axisLabels?: GraphAxisTick[];
  bottomLabels?: GraphAxisTick[];
  bottomLabelsEditOnly?: boolean;
  onAxisEdit?: (axis: 'x' | 'y', index: number, value: string) => void;
  smooth?: boolean;
  area?: boolean;
  highlightIndex?: number;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const draft = useRef(values);
  const [points, setPoints] = useState(values);
  useEffect(() => { draft.current = values; setPoints(values); }, [values]);

  const coordinates = points.map((value, index) => ({
    x: plot.left + (plot.right - plot.left) * index / Math.max(1, points.length - 1),
    y: plot.bottom - Math.max(0, Math.min(maxValue, value)) / maxValue * (plot.bottom - plot.top),
  }));
  const linePath = coordinates.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const curvePath = smooth && coordinates.length > 2
    ? `${coordinates.slice(1).map((point, index) => {
      const previous = coordinates[index];
      const middleX = (previous.x + point.x) / 2;
      const middleY = (previous.y + point.y) / 2;
      return `${index ? '' : `M ${previous.x} ${previous.y} `}Q ${previous.x} ${previous.y} ${middleX} ${middleY}`;
    }).join(' ')} T ${coordinates.at(-1)?.x} ${coordinates.at(-1)?.y}`
    : linePath;
  const path = area && coordinates.length ? `${curvePath} L ${plot.right} ${plot.bottom} L ${plot.left} ${plot.bottom} Z` : curvePath;

  function valueAt(clientY: number) {
    const bounds = svg.current?.getBoundingClientRect();
    if (!bounds || !bounds.height) return 0;
    const y = (clientY - bounds.top) * height / bounds.height;
    return Math.round(Math.max(0, Math.min(maxValue, maxValue * (plot.bottom - y) / (plot.bottom - plot.top))) * 10) / 10;
  }
  function updatePoint(index: number, value: number) {
    const next = [...draft.current];
    next[index] = Math.round(Math.max(0, Math.min(maxValue, value)) * 10) / 10;
    draft.current = next;
    setPoints(next);
    return next;
  }
  function renderAxisTick(tick: GraphAxisTick, bottom = false) {
    const textY = bottom ? height - 4 : tick.y ?? height - 4;
    const textAnchor = tick.anchor ?? 'start';
    if (editMode && onAxisEdit) {
      const boxWidth = tick.width ?? (textAnchor === 'end' ? 42 : 48);
      const boxX = textAnchor === 'end' ? tick.x - boxWidth : tick.x;
      const boxY = bottom ? height - 20 : textY - 12;
      return <foreignObject key={`${tick.axis}-${tick.index}`} x={boxX} y={boxY} width={boxWidth} height={18}>
        <div className="graph-axis-edit" style={{ textAlign: textAnchor }}>
          <InlineValue value={tick.text} display={tick.text} label={`Edit ${tick.axis}-axis label ${tick.index + 1} on ${label}`} type="text" staticMode onSave={value => onAxisEdit(tick.axis, tick.index, String(value))} />
        </div>
      </foreignObject>;
    }
    return <text key={`${tick.axis}-${tick.index}`} x={tick.x} y={textY} textAnchor={textAnchor}>{tick.text}</text>;
  }

  return <div className={`${className}${editMode ? ' is-editing-graph' : ''}`} role="group" aria-label={label}>
    <svg ref={svg} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <g aria-hidden="true">
        {gridLevels.map((level, index) => {
          const y = plot.bottom - level * (plot.bottom - plot.top);
          return <path className="trend-grid" key={index} d={`M ${plot.left} ${y} H ${plot.right}`} />;
        })}
        {area && <path className="trend-area" d={path} />}
        <path className="trend-line" d={curvePath} />
      </g>
      <g className="trend-axis">{axisLabels.map(tick => renderAxisTick(tick))}{(!bottomLabelsEditOnly || editMode) && bottomLabels.map(tick => renderAxisTick(tick, true))}</g>
      {coordinates.map((point, index) => <g key={index}>
        {editMode && <circle
          className="trend-point-hit"
          cx={point.x}
          cy={point.y}
          r={6}
          strokeWidth={12}
          role="slider"
          tabIndex={0}
          aria-label={`${label}, point ${index + 1}`}
          aria-valuemin={0}
          aria-valuemax={maxValue}
          aria-valuenow={points[index]}
          aria-valuetext={`${points[index]}${maxValue === 100 || className.includes('engagement') || className.includes('retention') ? '%' : ''}`}
          onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); updatePoint(index, valueAt(event.clientY)); }}
          onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) updatePoint(index, valueAt(event.clientY)); }}
          onPointerUp={event => { const next = updatePoint(index, valueAt(event.clientY)); onChange(next); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
          onPointerCancel={event => { onChange(draft.current); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
          onKeyDown={event => {
            const step = event.shiftKey ? 5 : 1;
            if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const current = draft.current[index];
            const nextValue = event.key === 'Home' ? 0 : event.key === 'End' ? maxValue : current + (event.key === 'ArrowUp' ? step : -step);
            onChange(updatePoint(index, nextValue));
          }}
        />}
        <circle
          className={`trend-point ${index === highlightIndex ? 'is-highlighted' : ''}`}
          cx={point.x}
          cy={point.y}
          r={editMode ? 6 : index === highlightIndex ? 3.8 : 0}
          pointerEvents={editMode ? 'none' : undefined}
        />
      </g>)}
    </svg>
  </div>;
}

export default function Studio() {
  const rawProject = useSavedProject();
  const project = useMemo(() => rawProject ? parseProject(rawProject) : defaultProject, [rawProject]);
  const [tab, setTab] = useState('Overview');
  const [editMode, setEditMode] = useState(false);
  const [notice, setNotice] = useState('');
  const [valid, setValid] = useState(true);
  const [engagementSecond, setEngagementSecond] = useState(0);
  const [retentionSecond, setRetentionSecond] = useState(1);
  const durationSeconds = Math.max(1, Math.floor(project.duration));
  const selectedRetentionSecond = Math.min(retentionSecond, durationSeconds);
  const retentionPointIndex = Math.round(selectedRetentionSecond / durationSeconds * (project.retentionTrend.length - 1));
  const retentionPercent = project.retentionTrend[retentionPointIndex];
  const maleEndAngle = project.male * 1.8;
  const femaleEndAngle = (project.male + project.female) * 1.8;
  const genderEndAngle = (project.male + project.female + project.other) * 1.8;
  const coverInput = useRef<HTMLInputElement>(null);
  const savedToastTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (savedToastTimer.current !== null) window.clearTimeout(savedToastTimer.current);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('activation')) return;
    url.searchParams.delete('activation');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    let active = true;
    async function check() {
      try { if (!(await fetch('/api/license', { cache: 'no-store' })).ok && active) setValid(false); }
      catch { if (active) setValid(false); }
    }
    void check();
    const timer = setInterval(check, 60000);
    return () => { active = false; clearInterval(timer); };
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

  function persist(next: Project) {
    const parsed = projectSchema.safeParse(next);
    if (!parsed.success) { setNotice(parsed.error.issues[0].message); return; }
    setNotice('');
    try {
      try { window.localStorage?.setItem(projectKey, JSON.stringify(parsed.data)); }
      catch { throw new Error('Your browser is blocking storage, so edits cannot be saved on this device.'); }
      window.dispatchEvent(new Event(projectKey));
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Save failed.'); }
  }

  function toggleEditMode() {
    if (savedToastTimer.current !== null) window.clearTimeout(savedToastTimer.current);
    savedToastTimer.current = null;
    if (editMode && !notice) {
      const savedMessage = 'Saved on this device.';
      setNotice(savedMessage);
      savedToastTimer.current = window.setTimeout(() => {
        setNotice(current => current === savedMessage ? '' : current);
        savedToastTimer.current = null;
      }, 1000);
    } else if (!editMode && notice === 'Saved on this device.') {
      setNotice('');
    }
    setEditMode(!editMode);
  }

  function editNumber(field: NumberField, value: number) {
    const percentFields: NumberField[] = ['completion', 'averageRetention', 'newViewers', 'nonFollowers', 'male', 'female', 'other'];
    const safeValue = percentFields.includes(field) ? Math.max(0, Math.min(100, value)) : field === 'viewerPeriodDays' ? Math.round(Math.max(1, Math.min(365, value))) : value;
    const next = { ...project, [field]: safeValue } as Project;
    if (field === 'male') { next.male = Math.min(safeValue, 100 - next.female); next.other = 100 - next.male - next.female; }
    if (field === 'female') { next.female = Math.min(safeValue, 100 - next.male); next.other = 100 - next.male - next.female; }
    if (field === 'other') { next.other = Math.min(safeValue, 100 - next.male); next.female = 100 - next.male - next.other; }
    void persist(next);
  }
  function editText(field: TextField, value: string) { void persist({ ...project, [field]: value }); }
  function editTrend(field: TrendField, values: number[]) { void persist({ ...project, [field]: values }); }
  function editAge(index: number, value: number) {
    const ages = [...project.ages];
    const balanceIndex = index === ages.length - 1 ? ages.length - 2 : ages.length - 1;
    const fixedTotal = ages.reduce((total, age, i) => total + (i === index || i === balanceIndex ? 0 : age), 0);
    ages[index] = Math.min(Math.max(0, value), 100 - fixedTotal);
    ages[balanceIndex] = 100 - fixedTotal - ages[index];
    void persist({ ...project, ages });
  }
  function editLocation(index: number, value: number) {
    const otherTotal = project.locations.reduce((total, location, i) => total + (i === index ? 0 : location.value), 0);
    const available = Math.max(0, 100 - otherTotal);
    const locations = project.locations.map((location, i) => i === index ? { ...location, value: Math.min(Math.max(0, value), available) } : location);
    void persist({ ...project, locations });
  }
  function editAnalyticsRow(field: 'trafficSources' | 'searchQueries', index: number, value: number) {
    const rows = project[field].map((row, i) => i === index ? { ...row, value: Math.max(0, Math.min(100, value)) } : row);
    void persist({ ...project, [field]: rows });
  }
  function editAxis(field: AxisField, index: number, value: string) {
    const labels = [...project[field]];
    labels[index] = value.slice(0, field.endsWith('YAxis') ? 20 : 40);
    void persist({ ...project, [field]: labels });
  }
  async function replaceCover(file?: File) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2_000_000) {
      setNotice('Choose a PNG, JPG or WebP smaller than 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') { setNotice('Unable to read the selected thumbnail.'); return; }
      void persist({ ...project, cover: reader.result });
    };
    reader.onerror = () => setNotice('Unable to read the selected thumbnail.');
    reader.readAsDataURL(file);
  }

  if (rawProject === null) return <main className="phone" aria-busy="true" />;
  if (!valid) return <main className="activation"><div className="activation-card"><h1>Check your access</h1><p>Your session expired or could not be verified. Re-enter your access code to continue.</p><button className="primary" onClick={() => window.location.reload()}>Continue to activation</button></div></main>;

  return <EditingContext.Provider value={editMode}><main className="phone">
    <header className="app-header">
      <button className="icon-button" aria-label="Back to overview" onClick={() => setTab('Overview')}><ArrowLeft size={20} /></button>
      <h1><InlineValue value={project.title} display="Video analytics" label="Video title" type="text" className="inline-title" onSave={value => editText('title', String(value))} /></h1>
      <button type="button" className={`studio-pill ${editMode ? 'is-editing' : ''}`} aria-label={editMode ? 'Exit edit mode' : 'Enter edit mode'} aria-pressed={editMode} onClick={toggleEditMode}><StudioBadgeIcon />TikTok Studio</button>
    </header>
    <section className="video-summary">
      <div className="cover-button"><button className="cover-image" onClick={() => coverInput.current?.click()} aria-label="Upload video thumbnail"><Image src={project.cover} alt={project.title} width={80} height={108} unoptimized /></button><span><InlineValue value={project.duration} label="Video duration in seconds" display={`${project.duration.toFixed(2)}s`} step="any" onSave={value => editNumber('duration', Number(value))} /></span></div>
      <input ref={coverInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { void replaceCover(e.target.files?.[0]); e.target.value = ''; }} />
      <p>Posted on <InlineValue value={project.date} label="Post date" type="text" onSave={value => editText('date', String(value))} /></p>
      <div className="counts">{[Play, Heart, MessageCircleMore, null, Bookmark].map((Icon, index) => <div key={index}>{Icon ? <Icon aria-label={['Views', 'Likes', 'Comments', 'Shares', 'Saves'][index]} /> : <ShareMetricIcon label="Shares" />}<InlineValue value={[project.views, project.likes, project.comments, project.shares, project.saves][index]} label={['Video views', 'Likes', 'Comments', 'Shares', 'Saves'][index]} display={[project.views, project.likes, project.comments, project.shares, project.saves][index].toLocaleString()} onSave={value => editNumber((['views', 'likes', 'comments', 'shares', 'saves'] as NumberField[])[index], Number(value))} /></div>)}</div>
    </section>

    <Tabs value={tab} onValueChange={setTab}>
      <TabsList variant="line" className="analysis-tabs">{['Inspiration', 'Overview', 'Viewers', 'Engagement'].map(item => <TabsTrigger key={item} value={item}>{item}</TabsTrigger>)}</TabsList>
      <TabsContent value="Overview">
        <section className="panel key-metrics-panel"><h2>Key metrics <Info /></h2><p className="muted">Updated on 10/20/2026.</p>
          <div className="metrics">
            <div className="selected"><span>Video views</span><strong><InlineValue value={project.views} label="Video views" display={Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(project.views)} staticMode onSave={value => editNumber('views', Number(value))} /></strong></div>
            <div><span>Total play time</span><strong><InlineValue value={project.playTime} label="Total play time" type="text" staticMode onSave={value => editText('playTime', String(value))} /></strong></div>
            <div><span>Average watch time</span><strong><InlineValue value={project.watchTime} label="Average watch time in seconds" display={`${project.watchTime}s`} step="any" staticMode onSave={value => editNumber('watchTime', Number(value))} /></strong></div>
            <div><span>Watched full video</span><strong><InlineValue value={project.completion} label="Watched full video percentage" display={`${project.completion}%`} step="any" max={100} staticMode onSave={value => editNumber('completion', Number(value))} /></strong></div>
            <div><span>New followers</span><strong><InlineValue value={project.followers} label="New followers" staticMode onSave={value => editNumber('followers', Number(value))} /></strong></div>
          </div>
          <EditableTrendGraph className="views-chart editable-graph" label="Video views from September 21 to September 27" values={project.viewTrend} maxValue={100} editMode={editMode} onChange={values => editTrend('viewTrend', values)} onAxisEdit={(axis, index, value) => editAxis(axis === 'x' ? 'viewXAxis' : 'viewYAxis', index, value)} width={320} height={160} plot={{ left: 4, right: 276, top: 12, bottom: 132 }} gridLevels={[1, 2 / 3, 1 / 3, 0]} axisLabels={[{ text: project.viewYAxis[0], x: 286, y: 16, axis: 'y', index: 0 }, { text: project.viewYAxis[1], x: 286, y: 56, axis: 'y', index: 1 }, { text: project.viewYAxis[2], x: 286, y: 96, axis: 'y', index: 2 }]} bottomLabels={[{ text: project.viewXAxis[0], x: 4, axis: 'x', index: 0 }, { text: project.viewXAxis[1], x: 276, anchor: 'end', axis: 'x', index: 1 }]} smooth area />
          <p className="chart-note">Chart shows the data trend during the first 7 days after posting.</p>
        </section>
        <section className="panel retention-panel">
          <h2>Retention rate <Info /></h2>
          <p className="retention-primary">On average, viewers watched <InlineValue value={project.averageRetention} label="Average retention percentage" step="any" max={100} staticMode onSave={value => editNumber('averageRetention', Number(value))} />% of your video.</p>
          <p className="retention-copy">Most viewers stopped watching at 0:01. Check out the moment in your video where most viewers lost interest.</p>
          <div className="retention-video">
            <Image src={project.cover === '/video-cover.png' ? '/video-preview.png' : project.cover} alt="Video thumbnail" width={168} height={264} unoptimized />
            {project.cover !== '/video-cover.png' && <span aria-hidden="true"><Play size={26} fill="white" strokeWidth={0} /></span>}
          </div>
          <EditableTrendGraph className="retention-chart editable-graph" label="Audience retention" values={project.retentionTrend} maxValue={100} editMode={editMode} onChange={values => editTrend('retentionTrend', values)} onAxisEdit={(axis, index, value) => editAxis(axis === 'x' ? 'retentionXAxis' : 'retentionYAxis', index, value)} width={300} height={100} plot={{ left: 8, right: 258, top: 10, bottom: 90 }} gridLevels={[1, 0.5, 0]} axisLabels={[{ text: project.retentionYAxis[0], x: 266, y: 14, axis: 'y', index: 0 }, { text: project.retentionYAxis[1], x: 266, y: 54, axis: 'y', index: 1 }]} bottomLabels={[{ text: project.retentionXAxis[0], x: 8, axis: 'x', index: 0 }, { text: project.retentionXAxis[1], x: 258, anchor: 'end', axis: 'x', index: 1 }]} bottomLabelsEditOnly smooth area highlightIndex={0} />
          <div className="retention-scrubber"><input type="range" min="0" max={durationSeconds} value={selectedRetentionSecond} onChange={event => setRetentionSecond(Number(event.target.value))} aria-label="Video retention time" /><div><span>00:{String(selectedRetentionSecond).padStart(2, '0')} (<InlineValue value={retentionPercent} label="Retention percentage at selected time" step="any" max={100} staticMode onSave={value => { const trend = [...project.retentionTrend]; trend[retentionPointIndex] = Math.max(0, Math.min(100, Number(value))); editTrend('retentionTrend', trend); }} />%)</span><span>00:{String(durationSeconds).padStart(2, '0')}</span></div></div>
        </section>
        <section className="panel analytics-list-panel traffic-sources"><h2>Traffic sources <Info /></h2><AnalyticsBars rows={project.trafficSources} onEdit={(index, value) => editAnalyticsRow('trafficSources', index, value)} /></section>
        <section className="panel analytics-list-panel search-queries"><h2>Search queries <Info /></h2><AnalyticsBars rows={project.searchQueries} onEdit={(index, value) => editAnalyticsRow('searchQueries', index, value)} /></section>
        <section className="panel promote-card"><div><strong>Want more traffic?</strong><span>Use Promote to grow your audience.</span></div><ChevronRight size={20} /></section>
        <section className="other-posts"><strong>View data for other posts</strong><div>{[1, 2, 3].map(index => <Image key={index} src={`/other-post-${index}.png`} alt="" width={34} height={34} unoptimized />)}</div></section>
      </TabsContent>
      <TabsContent value="Viewers">
        <section className="panel total-viewers-panel"><h2>Total viewers <Info /></h2><strong className="viewer-total-value"><InlineValue value={project.totalViewers} label="Total viewers" type="text" onSave={value => editText('totalViewers', String(value))} /></strong><p className="viewer-comparison">{project.viewerChange > 0 ? '+' : ''}<InlineValue value={project.viewerChange} label="Viewer change compared with selected period" display={project.viewerChange.toLocaleString()} onSave={value => editNumber('viewerChange', Number(value))} />&nbsp; (vs <InlineValue value={project.viewerPeriodDays} label="Comparison period in days" min={1} max={365} onSave={value => editNumber('viewerPeriodDays', Number(value))} />d ago)</p></section>
        <section className="panel viewer-types-panel"><h2>Viewer types <Info /></h2>
          <div className="viewer-breakdown"><div className="viewer-percentages"><strong><InlineValue value={project.newViewers} label="New viewers percentage" step="any" max={100} onSave={value => editNumber('newViewers', Number(value))} />%</strong><strong><InlineValue value={100 - project.newViewers} label="Returning viewers percentage" step="any" max={100} onSave={value => editNumber('newViewers', 100 - Number(value))} />%</strong></div><div className="viewer-segments"><span style={{ width: `${project.newViewers}%` }} /><span style={{ width: `${100 - project.newViewers}%` }} /></div><div className="viewer-labels"><span>New viewers</span><span>Returning viewers</span></div></div>
          <div className="viewer-breakdown"><div className="viewer-percentages"><strong><InlineValue value={project.nonFollowers} label="Non-followers percentage" step="any" max={100} onSave={value => editNumber('nonFollowers', Number(value))} />%</strong><strong><InlineValue value={100 - project.nonFollowers} label="Followers percentage" step="any" max={100} onSave={value => editNumber('nonFollowers', 100 - Number(value))} />%</strong></div><div className="viewer-segments"><span style={{ width: `${project.nonFollowers}%` }} /><span style={{ width: `${100 - project.nonFollowers}%` }} /></div><div className="viewer-labels"><span>Non-followers</span><span>Followers</span></div></div>
        </section>
        <section className="panel"><h2>Gender</h2><div className="half-chart" role="img" aria-label={`Male ${project.male}%, Female ${project.female}%, Other ${project.other}%`}><div style={{ background: `conic-gradient(from -90deg,#0078d4 0deg ${maleEndAngle}deg,#78b7e5 ${maleEndAngle}deg ${femaleEndAngle}deg,#cbe3f5 ${femaleEndAngle}deg ${genderEndAngle}deg,transparent ${genderEndAngle}deg 360deg)` }} /></div>{[['Male', 'male', project.male, '#0078d4'], ['Female', 'female', project.female, '#78b7e5'], ['Other', 'other', project.other, '#cbe3f5']].map(([label, field, value, color]) => <div className="gender-row" key={String(field)}><i style={{ background: String(color) }} /><strong>{label}</strong><b><InlineValue value={Number(value)} label={`${label} percentage`} step="any" max={100} onSave={next => editNumber(String(field) as NumberField, Number(next))} />%</b></div>)}</section>
        <section className="panel"><h2>Age</h2><Bars rows={ageLabels.map((name, index) => ({ name, value: project.ages[index] }))} onEdit={editAge} /></section>
        <section className="panel"><h2>Locations <Info /></h2><Bars rows={project.locations} onEdit={editLocation} /></section>
      </TabsContent>
      <TabsContent value="Engagement">
        <section className="panel engagement-panel engagement-words-panel"><h2>Top words used in comments <Info /></h2><p>Top word insights are not ready yet. Please check back later.</p></section>
        <section className="panel engagement-panel engagement-likes-panel">
          <h2>Likes <Info /></h2>
          <p className="engagement-copy">Most viewers liked this video at 0:01. Check out the moment where most viewers liked your video.</p>
          <div className="engagement-video"><Image src={project.cover === '/video-cover.png' ? '/video-preview.png' : project.cover} alt="Video thumbnail" width={168} height={264} unoptimized />{project.cover !== '/video-cover.png' && <span aria-hidden="true"><Play size={36} fill="white" strokeWidth={0} /></span>}</div>
          <EditableTrendGraph className="engagement-chart editable-graph" label="Likes over the video timeline" values={project.likesTrend} maxValue={80} editMode={editMode} onChange={values => editTrend('likesTrend', values)} onAxisEdit={(axis, index, value) => editAxis(axis === 'x' ? 'likesXAxis' : 'likesYAxis', index, value)} width={300} height={100} plot={{ left: 8, right: 258, top: 10, bottom: 80 }} gridLevels={[1, 0.75, 0.5, 0.25]} axisLabels={[{ text: project.likesYAxis[0], x: 266, y: 14, axis: 'y', index: 0 }, { text: project.likesYAxis[1], x: 266, y: 32, axis: 'y', index: 1 }, { text: project.likesYAxis[2], x: 266, y: 47, axis: 'y', index: 2 }, { text: project.likesYAxis[3], x: 266, y: 62, axis: 'y', index: 3 }]} bottomLabels={[{ text: project.likesXAxis[0], x: 8, axis: 'x', index: 0 }, { text: project.likesXAxis[1], x: 258, anchor: 'end', axis: 'x', index: 1 }]} bottomLabelsEditOnly area highlightIndex={0} />
          <div className="engagement-scrubber"><input type="range" min="0" max={durationSeconds} value={engagementSecond} onChange={event => setEngagementSecond(Number(event.target.value))} aria-label="Likes graph timeline" /></div>
        </section>
      </TabsContent>
      <TabsContent value="Inspiration"><section className="panel"><h2>Inspiration</h2><p className="muted">No inspiration data was included in this video.</p><button className="primary" onClick={() => setTab('Overview')}>View video metrics</button></section></TabsContent>
    </Tabs>
    {notice && <div className="save-toast" role="status"><Check size={16} />{notice}<button aria-label="Dismiss" onClick={() => setNotice('')}>×</button></div>}
  </main></EditingContext.Provider>;
}
