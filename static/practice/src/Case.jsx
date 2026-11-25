// Case preview for leads: the cleaned ticket, the customer card and a test chat with the AI customer.
import { call } from './api.js';
import { useLoad, Spinner, ErrorBox, Lozenge } from './ui.jsx';

export default function Case({ caseId, go }) {
  const c = useLoad(() => call('caseDetail', { caseId }), [caseId]);
  if (c.loading && !c.data) return <Spinner />;
  if (c.error) return <ErrorBox error={c.error} onRetry={c.reload} />;
  const d = c.data;
  const test = async () => { const run = await call('previewCase', { caseId }); go('preview', { runId: run.id }); };
  return (
    <div className="stack">
      <header className="row space">
        <div>
          <button className="link" onClick={() => go('back')}>← Track</button>
          <h1>{d.summary}</h1>
          <div className="muted small">{d.requestType} · {d.key} · practice value {d.value?.score ?? '–'}</div>
        </div>
        <button className="primary" onClick={test}>Test the AI customer</button>
      </header>
      <div className="two-col">
        <section className="stack">
          <div className="panel">
            <h3>What the trainee sees first</h3>
            <div className="quote">{d.customer.opening}</div>
            <h3>Customer card</h3>
            <p><strong>Persona:</strong> {d.customer.persona}</p>
            <table className="table">
              <thead><tr><th>Id</th><th>Detail the customer knows</th><th>Given when the trainee asks about</th></tr></thead>
              <tbody>{d.customer.facts.map((f) => <tr key={f.id}><td>{f.id}</td><td>{f.detail} {f.kind === 'reaction' && <Lozenge>reaction</Lozenge>}</td><td>{f.asked_by}</td></tr>)}</tbody>
            </table>
            <p className="muted small">{d.customer.secretCount} agent-only terms are blocked from the customer's replies (internal hostnames, codes and fix details).</p>
          </div>
        </section>
        <aside className="panel">
          <h3>Real ticket, cleaned</h3>
          <ol className="thread compact">
            {d.debrief.map((m, i) => (
              <li key={i} className={`msg ${m.from} ${m.public ? '' : 'internal'}`}><div className="who">{m.author}{!m.public && <Lozenge tone="warn">Internal</Lozenge>}</div><div className="body">{m.body}</div></li>
            ))}
          </ol>
          <div className="resolution"><strong>Resolution:</strong> {d.resolution}</div>
          <p className="muted small">Check that no personal data is left. Remove the case from the track if it is not safe to practise on.</p>
        </aside>
      </div>
    </div>
  );
}
