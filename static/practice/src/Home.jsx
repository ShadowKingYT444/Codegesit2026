// Trainee home: suggested tickets, runs to continue, assigned tracks and weak spots.
import { call } from './api.js';
import { useLoad, Spinner, ErrorBox, Lozenge, statusTone, STATUS_LABEL, ago, Empty, ERROR_LABEL, pct } from './ui.jsx';

export default function Home({ go, ctx }) {
  const home = useLoad(() => call('home'));
  const start = async (caseId) => { const run = await call('startRun', { caseId }); go('run', { runId: run.id }); };
  if (home.loading && !home.data) return <Spinner />;
  if (home.error) return <ErrorBox error={home.error} onRetry={home.reload} />;
  const { tracks, runs, picks, weakSpots } = home.data;
  const active = runs.filter((r) => r.status === 'active');
  if (!tracks.length) {
    return (
      <Empty title="No practice track yet">
        {ctx.isLead ? <>Give new agents practice reps on your own solved tickets, before they meet a live customer. Build a track from your solved tickets or a demo pack, then assign it to trainees. <button className="link" onClick={() => go('tracks')}>Build a track</button></> : 'Ask your team lead to assign you a Ride-Along practice track.'}
      </Empty>
    );
  }
  return (
    <div className="stack">
      {active.length > 0 && (
        <section>
          <h2>Continue</h2>
          <div className="cards">
            {active.map((r) => (
              <button key={r.id} className="card action" onClick={() => go('run', { runId: r.id })}>
                <div className="card-key">{r.key}</div><div className="card-title">{r.summary}</div>
                <div className="muted small">{r.turns} replies · started {ago(r.startedAt)}</div>
              </button>
            ))}
          </div>
        </section>
      )}
      {picks.length > 0 && (
        <section>
          <h2>Suggested for you</h2>
          <p className="muted">Picked from your weak spots and the request types you haven't practised yet.</p>
          <div className="cards">
            {picks.map((p) => (
              <div key={p.caseId} className="card">
                <div className="card-key">{p.requestType}</div>
                <div className="card-title">{p.summary}</div>
                {p.reasons.length > 0 && <div className="muted small">{p.reasons.join(' · ')}</div>}
                <div className="card-foot"><button className="primary" onClick={() => start(p.caseId)}>Practise</button></div>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="two-col">
        <section>
          {tracks.map((t) => (
            <div key={t.id} className="panel">
              <h2>{t.name} <span className="muted small">{t.cases.filter((c) => c.solved).length} of {t.cases.length} solved</span></h2>
              <table className="table">
                <thead><tr><th>Request type</th><th>Ticket</th><th aria-label="Action" /></tr></thead>
                <tbody>
                  {t.cases.map((c) => (
                    <tr key={c.id}>
                      <td className="nowrap">{c.requestType}</td>
                      <td>{c.summary}</td>
                      <td className="right nowrap">{c.solved ? <Lozenge tone="good">Solved</Lozenge> : <button onClick={() => start(c.id)}>Practise</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
        <aside className="stack">
          <div className="panel">
            <h3>Your weak spots</h3>
            {weakSpots.turns === 0 ? <p className="muted">No graded replies yet.</p> : (
              <>
                <p className="muted small">From your last {weakSpots.turns} graded replies.</p>
                {weakSpots.top.length === 0 ? <p>No repeated errors. Nice work.</p> : (
                  <ul className="plain">{weakSpots.top.map((ty) => <li key={ty}><strong>{ERROR_LABEL[ty]}</strong> <span className="muted">in {weakSpots.byType[ty].errors} replies</span></li>)}</ul>
                )}
                <h4>By request type</h4>
                <ul className="plain">{Object.entries(weakSpots.byRequestType).map(([rt, v]) => <li key={rt}>{rt}: <span className="muted">errors in {v.errors} of {v.turns} · {pct(Math.round(100 * (1 - v.errors / v.turns)))} clean</span></li>)}</ul>
              </>
            )}
          </div>
          <div className="panel">
            <h3>Recent runs</h3>
            {runs.length === 0 ? <p className="muted">None yet.</p> : (
              <ul className="plain">
                {runs.slice(0, 8).map((r) => (
                  <li key={r.id}>
                    <button className="link" onClick={() => go(r.status === 'active' ? 'run' : 'debrief', { runId: r.id })}>{r.key}</button>{' '}
                    <Lozenge tone={statusTone(r.status)}>{STATUS_LABEL[r.status]}</Lozenge> <span className="muted small">{r.turns} replies</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
