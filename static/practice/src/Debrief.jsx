// End-of-run debrief: the real (cleaned) ticket beside the trainee's run, with the turn where each detail came out.
import { useState } from 'react';
import { call } from './api.js';
import { useLoad, Spinner, ErrorBox, Lozenge, GradeLines, Mark, statusTone, STATUS_LABEL } from './ui.jsx';

export default function Debrief({ runId, go, lead = false }) {
  const d = useLoad(() => call('debrief', { runId }), [runId]);
  if (d.loading && !d.data) return <Spinner />;
  if (d.error) return <ErrorBox error={d.error} onRetry={d.reload} />;
  const { case: c, realThread, resolution, myRun, facts, status } = d.data;
  const found = facts.filter((f) => f.turn != null && f.kind !== 'reaction').length;
  const total = facts.filter((f) => f.kind !== 'reaction').length;
  return (
    <div className="stack">
      <header className="row space">
        <div>
          <div className="muted small">{c.requestType} · {c.key}</div>
          <h1>{c.summary}</h1>
        </div>
        <div className="row"><Lozenge tone={statusTone(status)}>{STATUS_LABEL[status]}</Lozenge><button onClick={() => go('back')}>Back</button></div>
      </header>

      <div className="panel">
        <h3>What the customer knew <span className="muted small">you found {found} of {total} details</span></h3>
        <ul className="facts">
          {facts.filter((f) => f.kind !== 'reaction').map((f) => (
            <li key={f.id} className={f.turn ? 'found' : 'missed'}>
              <span className="fact-turn">{f.turn ? `reply ${f.turn}` : 'never asked'}</span>
              <span>{f.detail}</span>
              {!f.turn && <span className="muted small"> · would come out if you asked about {f.asked_by}</span>}
            </li>
          ))}
        </ul>
        <div className="resolution"><strong>What actually fixed it:</strong> {resolution}</div>
      </div>

      <div className="two-col even">
        <section className="panel">
          <h3>The real ticket <span className="muted small">personal data replaced</span></h3>
          <ol className="thread compact">
            {realThread.map((m, i) => (
              <li key={i} className={`msg ${m.from} ${m.public ? '' : 'internal'}`}>
                <div className="who">{m.author}{!m.public && <Lozenge tone="warn">Internal note</Lozenge>}</div>
                <div className="body">{m.body}</div>
              </li>
            ))}
          </ol>
        </section>
        <section className="panel">
          <h3>Your run</h3>
          <ol className="thread compact">
            <li className="msg customer"><div className="who">Customer</div><div className="body">{myRun.opening}</div></li>
            {myRun.turns.map((t) => (
              <MyTurn key={t.id} t={t} facts={facts} lead={lead} />
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function MyTurn({ t, facts, lead }) {
  const [flagged, setFlagged] = useState(false);
  const out = facts.filter((f) => f.turn === t.n);
  const flag = async () => { const note = prompt('Why is this grade wrong? (optional)') ?? null; if (note === null) return; await call('overrideGrade', { turnId: t.id, note }); setFlagged(true); };
  return (
    <>
      <li className="msg agent">
        <div className="who">Reply {t.n} <Mark mark={t.mark} /></div>
        <div className="body">{t.trainee}</div>
        <GradeLines grade={t.grade} mark={t.mark} />
        {lead && t.grade && (flagged ? <span className="muted small">Marked as a wrong grade</span> : <button className="link small" onClick={flag}>Mark grade wrong</button>)}
      </li>
      <li className="msg customer">
        <div className="who">Customer</div>
        <div className="body">{t.reply}</div>
        {out.length > 0 && <div className="found-here">Found: {out.map((f) => f.detail).join(' · ')}</div>}
      </li>
    </>
  );
}
