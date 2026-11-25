// Lead flow 1: build a practice track from a JQL filter of solved tickets, or from a demo pack.
import { useEffect, useState } from 'react';
import { call } from './api.js';
import { useLoad, Spinner, ErrorBox, Lozenge, statusTone, STATUS_LABEL, ago, Empty } from './ui.jsx';

export default function Tracks({ go, ctx }) {
  const list = useLoad(() => call('listTracks'));
  const [showNew, setShowNew] = useState(false);
  const building = (list.data || []).some((t) => t.cases.building > 0);
  useEffect(() => { if (!building) return undefined; const t = setInterval(list.reload, 4000); return () => clearInterval(t); }, [building]); // eslint-disable-line react-hooks/exhaustive-deps
  if (list.loading && !list.data) return <Spinner />;
  return (
    <div className="stack">
      <header className="row space">
        <div><h1>Practice tracks</h1><p className="muted">Each track is a set of cleaned practice cases built from solved tickets.</p></div>
        <button className="primary" onClick={() => setShowNew(!showNew)}>{showNew ? 'Close' : 'New track'}</button>
      </header>
      <ErrorBox error={list.error} onRetry={list.reload} />
      {showNew && <NewTrack ctx={ctx} onDone={(id) => { setShowNew(false); list.reload(); go('track', { trackId: id }); }} />}
      {list.data && list.data.length === 0 && !showNew && <Empty title="No tracks yet">AI now answers the easy tickets that used to train new agents. Ride-Along turns your solved tickets into safe practice reps. Start with a demo pack: it is ready at once. Then build a track from your own solved tickets.</Empty>}
      <div className="cards">
        {(list.data || []).map((t) => (
          <button key={t.id} className="card action" onClick={() => go('track', { trackId: t.id })}>
            <div className="row space"><span className="card-key">{t.source === 'demo' ? 'Demo pack' : 'From JQL'}</span><Lozenge tone={statusTone(t.status)}>{STATUS_LABEL[t.status]}</Lozenge></div>
            <div className="card-title">{t.name}</div>
            <div className="muted small">{t.cases.ready} ready{t.cases.building ? ` · ${t.cases.building} building` : ''}{t.cases.skipped ? ` · ${t.cases.skipped} skipped` : ''}{t.cases.failed ? ` · ${t.cases.failed} failed` : ''} · {t.assignees} trainees · {ago(t.createdAt)}</div>
            {t.cases.building > 0 && <div className="progress"><div style={{ width: `${Math.round(100 * (t.cases.total - t.cases.building) / Math.max(1, t.cases.total))}%` }} /></div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function NewTrack({ ctx, onDone }) {
  const [source, setSource] = useState('jsm');
  const [name, setName] = useState('');
  const [jql, setJql] = useState('resolution = Done AND created > -180d ORDER BY created DESC');
  const [packId, setPackId] = useState(ctx.packs[0]?.id);
  const [allowSensitive, setAllow] = useState(false);
  const [sample, setSample] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const preview = async () => { setErr(null); try { setSample((await call('previewJql', { jql })).sample); } catch (e) { setErr(e.message); } };
  const create = async () => {
    setBusy(true); setErr(null);
    try { const r = await call('createTrack', { source, name, jql, packId, allowSensitive }); onDone(r.id); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="panel form">
      <fieldset className="row">
        <legend className="sr-only">Source</legend>
        <label className="radio"><input type="radio" checked={source === 'jsm'} onChange={() => setSource('jsm')} /> My solved tickets (JQL)</label>
        <label className="radio"><input type="radio" checked={source === 'demo'} onChange={() => setSource('demo')} /> Demo pack</label>
      </fieldset>
      <label>Track name<input value={name} onChange={(e) => setName(e.target.value)} placeholder={source === 'demo' ? 'Uses the pack name if empty' : 'For example: VPN and passwords, week 1'} /></label>
      {source === 'jsm' ? (
        <>
          <label>JQL filter of solved tickets
            <textarea rows={3} value={jql} onChange={(e) => setJql(e.target.value)} />
          </label>
          <p className="muted small">Ride-Along keeps tickets with at least 2 customer messages and a clear resolution, and skips HR, security and legal types unless you allow them.</p>
          <div className="row"><button onClick={preview}>Preview tickets</button></div>
          {sample && <ul className="plain small">{sample.length ? sample.map((s) => <li key={s.key}><strong>{s.key}</strong> {s.summary}</li>) : <li className="muted">No tickets match.</li>}</ul>}
        </>
      ) : (
        <label>Pack
          <select value={packId} onChange={(e) => setPackId(e.target.value)}>
            {ctx.packs.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.tickets} tickets)</option>)}
          </select>
        </label>
      )}
      <label className="check"><input type="checkbox" checked={allowSensitive} onChange={(e) => setAllow(e.target.checked)} /> Allow sensitive request types (HR, security, legal)</label>
      <ErrorBox error={err} />
      <div className="row"><button className="primary" disabled={busy} onClick={create}>{busy ? 'Starting…' : 'Build track'}</button></div>
    </div>
  );
}
