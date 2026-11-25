// Track detail: preview and curate cases, assign trainees.
import { useEffect, useState } from 'react';
import { call } from './api.js';
import { useLoad, Spinner, ErrorBox, Lozenge, statusTone, STATUS_LABEL } from './ui.jsx';

export default function Track({ trackId, go }) {
  const t = useLoad(() => call('trackDetail', { trackId }), [trackId]);
  const building = (t.data?.cases || []).some((c) => ['queued', 'building'].includes(c.status));
  useEffect(() => { if (!building) return undefined; const x = setInterval(t.reload, 4000); return () => clearInterval(x); }, [building]); // eslint-disable-line react-hooks/exhaustive-deps
  if (t.loading && !t.data) return <Spinner />;
  if (t.error) return <ErrorBox error={t.error} onRetry={t.reload} />;
  const d = t.data;
  const act = async (fn, args) => { await call(fn, args); t.reload(); };
  const del = async () => { if (confirm(`Delete "${d.name}" with all its cases and practice runs?`)) { await call('deleteTrack', { trackId }); go('tracks'); } };
  return (
    <div className="stack">
      <header className="row space">
        <div>
          <button className="link" onClick={() => go('tracks')}>← Tracks</button>
          <h1>{d.name}</h1>
          <div className="muted small">{d.source === 'demo' ? 'Demo pack' : d.jql} · {d.sops} SOP pages</div>
        </div>
        <button className="danger" onClick={del}>Delete track</button>
      </header>
      <div className="two-col">
        <section className="panel">
          <h3>Cases</h3>
          <table className="table">
            <thead><tr><th>Ticket</th><th>Request type</th><th>Summary</th><th>Value</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {d.cases.map((c) => (
                <tr key={c.id} className={c.status === 'removed' ? 'dim' : ''}>
                  <td className="nowrap">{c.key}</td>
                  <td>{c.requestType}</td>
                  <td>{c.summary}{c.error && <div className="error-text small">{c.error}</div>}{c.status === 'skipped' && <div className="muted small">{c.reasons.filter((r) => /only|no |excluded|too/.test(r)).join(' · ')}</div>}</td>
                  <td className="nowrap" title={c.reasons.join('\n')}>{c.score ?? '–'}{c.facts ? <span className="muted small"> · {c.facts} details</span> : null}</td>
                  <td><Lozenge tone={statusTone(c.status)}>{STATUS_LABEL[c.status]}</Lozenge></td>
                  <td className="right nowrap">
                    {c.status === 'ready' && <><button onClick={() => go('case', { caseId: c.id })}>Preview</button> <button className="link" onClick={() => act('setCaseStatus', { caseId: c.id, status: 'removed' })}>Remove</button></>}
                    {c.status === 'removed' && <button className="link" onClick={() => act('setCaseStatus', { caseId: c.id, status: 'ready' })}>Restore</button>}
                    {c.status === 'failed' && <button className="link" onClick={() => act('retryCase', { caseId: c.id })}>Retry</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <aside className="panel">
          <h3>Trainees</h3>
          <ul className="plain">
            {d.assignees.map((a) => <li key={a.accountId} className="row space">{a.name}<button className="link" onClick={() => act('unassign', { trackId, accountId: a.accountId })}>Remove</button></li>)}
            {!d.assignees.length && <li className="muted">Nobody yet.</li>}
          </ul>
          <AddPeople onAdd={(ids) => act('assign', { trackId, accountIds: ids })} />
        </aside>
      </div>
    </div>
  );
}

function AddPeople({ onAdd }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState([]);
  const [err, setErr] = useState(null);
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return undefined; }
    const x = setTimeout(async () => { try { setHits(await call('searchUsers', { q })); } catch (e) { setErr(e.message); } }, 300);
    return () => clearTimeout(x);
  }, [q]);
  return (
    <div className="add-people">
      <label htmlFor="people" className="small">Assign a trainee</label>
      <input id="people" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" />
      <ErrorBox error={err} />
      <ul className="plain">{hits.map((h) => <li key={h.accountId}><button className="link" onClick={() => { onAdd([h.accountId]); setQ(''); }}>+ {h.displayName}</button></li>)}</ul>
    </div>
  );
}
