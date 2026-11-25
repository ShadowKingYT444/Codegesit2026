// Lead flow 3: progress, weak spots and queue readiness for every trainee.
import { call } from './api.js';
import { useLoad, Spinner, ErrorBox, Lozenge, ERROR_LABEL, pct, dollars, Empty, statusTone, STATUS_LABEL, ago } from './ui.jsx';

export default function Team({ go }) {
  const d = useLoad(() => call('dashboard'));
  if (d.loading && !d.data) return <Spinner />;
  if (d.error) return <ErrorBox error={d.error} onRetry={d.reload} />;
  const { trainees, overrides, gradedTurns, summary } = d.data;
  if (!trainees.length) return <Empty title="No trainees yet">Assign a practice track to someone to see their progress here. <button className="link" onClick={() => go('tracks')}>Go to tracks</button></Empty>;
  const confirm = async (accountId, trackId) => { await call('confirmReady', { accountId, trackId }); d.reload(); };
  return (
    <div className="stack">
      <header><h1>Team progress</h1><p className="muted">Solve rate, turns to solution and errors from each trainee's last 20 graded replies.</p></header>
      {summary && (
        <div className="tiles" role="list" aria-label="Team summary">
          <div className="tile" role="listitem"><div className="tile-n">{summary.repsWeek}</div><div className="tile-l">practice reps this week</div></div>
          <div className="tile" role="listitem"><div className="tile-n">{summary.readyConfirmed}<span className="tile-of"> / {summary.trainees}</span></div><div className="tile-l">ready for the live queue{summary.readyPending ? ` · ${summary.readyPending} to confirm` : ''}</div></div>
          <div className="tile" role="listitem"><div className="tile-n">{summary.repsToReady ?? '–'}</div><div className="tile-l">median reps to ready</div></div>
          <div className="tile" role="listitem"><div className="tile-n">{pct(summary.overrideRate)}</div><div className="tile-l">grades marked wrong by leads</div></div>
        </div>
      )}
      <div className="panel">
        <table className="table">
          <thead><tr><th>Trainee</th><th>Runs</th><th>Solve rate</th><th>Turns to solve</th><th>Clean replies</th><th>Weak spots</th><th>Queue readiness</th></tr></thead>
          <tbody>
            {trainees.map((t) => (
              <tr key={t.accountId}>
                <td><button className="link" onClick={() => go('trainee', { accountId: t.accountId, name: t.name })}>{t.name}</button></td>
                <td>{t.runs}</td>
                <td>{pct(t.solveRate)}</td>
                <td>{t.turnsToSolve ?? '–'}</td>
                <td>{pct(t.greenRate)}</td>
                <td>{t.weakSpots.top.slice(0, 2).map((ty) => <Lozenge key={ty} tone="warn">{ERROR_LABEL[ty]}</Lozenge>)}{!t.weakSpots.top.length && <span className="muted">–</span>}</td>
                <td>
                  {t.tracks.map((tr) => (
                    <div key={tr.id} className="small">
                      {tr.name}: {tr.solved}/{tr.total}{' '}
                      {tr.confirmed ? <Lozenge tone="good">Ready for queue</Lozenge> : tr.ready ? <button className="primary small" onClick={() => confirm(t.accountId, tr.id)}>Confirm ready</button> : <span className="muted">not yet</span>}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">Leads marked {overrides} of {gradedTurns} recent grades as wrong.</p>
    </div>
  );
}

export function Trainee({ accountId, name, go }) {
  const s = useLoad(() => call('traineeStats', { accountId }), [accountId]);
  if (s.loading && !s.data) return <Spinner />;
  if (s.error) return <ErrorBox error={s.error} onRetry={s.reload} />;
  const d = s.data;
  const types = Object.entries(d.weakSpots.byType);
  const max = Math.max(0.01, ...types.map(([, v]) => v.rate));
  return (
    <div className="stack">
      <header><button className="link" onClick={() => go('team')}>← Team</button><h1>{name}</h1>
        <p className="muted">{d.runs} runs · solve rate {pct(d.solveRate)} · {d.turnsToSolve ?? '–'} turns to solve · model cost {dollars(d.cost)}</p></header>
      <div className="two-col">
        <section className="panel">
          <h3>Errors by type <span className="muted small">smoothed rate over the last {d.weakSpots.turns} replies</span></h3>
          <ul className="bars">
            {types.map(([ty, v]) => (
              <li key={ty}><span className="bar-label">{ERROR_LABEL[ty]}</span><span className="bar"><span style={{ width: `${Math.round(100 * v.rate / max)}%` }} className={v.errors ? 'hot' : ''} /></span><span className="bar-n">{v.errors}</span></li>
            ))}
          </ul>
          <h3>By request type</h3>
          <table className="table"><thead><tr><th>Request type</th><th>Replies</th><th>With errors</th></tr></thead>
            <tbody>{Object.entries(d.weakSpots.byRequestType).map(([rt, v]) => <tr key={rt}><td>{rt}</td><td>{v.turns}</td><td>{v.errors}</td></tr>)}</tbody></table>
        </section>
        <aside className="stack">
          <div className="panel">
            <h3>Next practice tickets</h3>
            <ol className="plain">{d.picks.map((p) => <li key={p.caseId}><strong>{p.key}</strong> {p.summary}<div className="muted small">{p.reasons.join(' · ') || p.requestType}</div></li>)}</ol>
          </div>
          <div className="panel">
            <h3>Recent runs</h3>
            <ul className="plain">{d.recentRuns.map((r) => <li key={r.id}>{r.status === 'active' ? <span>In progress</span> : <button className="link" onClick={() => go('debrief', { runId: r.id, lead: true })}>Open debrief</button>} <Lozenge tone={statusTone(r.status)}>{STATUS_LABEL[r.status]}</Lozenge> <span className="muted small">{r.turns} replies · {ago(r.startedAt)}</span></li>)}</ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
