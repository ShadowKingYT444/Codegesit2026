// The practice screen. It looks like a JSM request: the customer's first message, the request type and the SLA clock.
// The real ticket, its internal notes and its resolution are never sent to this screen.
import { useEffect, useRef, useState } from 'react';
import { call, waitForTurn } from './api.js';
import { useLoad, Spinner, ErrorBox, Lozenge, Clock, GradeLines, Mark, statusTone, STATUS_LABEL } from './ui.jsx';

const OUTCOME = {
  solved: 'Solved. The customer confirmed that your fix worked.',
  limit: 'Turn limit reached.',
  ended: 'You ended this run.',
};

export default function Run({ runId, go, preview = false }) {
  const run = useLoad(() => call('getRun', { runId }), [runId]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);      // waiting for the customer reply
  const [grading, setGrading] = useState(null);  // turn id whose grade is still on its way
  const [err, setErr] = useState(null);
  const bottom = useRef(null);
  const turns = run.data?.turns || [];
  const visible = turns.filter((t, i) => !(t.status === 'failed' && turns.slice(i + 1).some((u) => u.n === t.n)));
  useEffect(() => { bottom.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }); }, [visible.length, busy]);
  useEffect(() => { // resume waiting if the page reloads while a turn is pending, or while its grade is on its way
    const p = turns.find((t) => t.status === 'pending');
    if (p && !busy) { setBusy(true); waitForTurn(p.id).then(() => run.reload()).catch((e) => setErr(e.message)).finally(() => setBusy(false)); return; }
    const g = turns.find((t) => t.status === 'replied');
    if (g && !busy && grading !== g.id) { setGrading(g.id); waitForTurn(g.id, { grade: true }).then(() => run.reload()).catch(() => {}).finally(() => setGrading(null)); }
  }, [run.data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (run.loading && !run.data) return <Spinner />;
  if (run.error) return <ErrorBox error={run.error} onRetry={run.reload} />;
  const r = run.data;
  const active = r.status === 'active';
  const done = visible.filter((t) => t.status === 'done' || t.status === 'replied').length;

  const send = async () => {
    const msg = text.trim();
    if (!msg || busy) return;
    setErr(null); setBusy(true);
    try {
      const { turnId } = await call('send', { runId, text: msg });
      setText('');
      run.setData({ ...r, turns: [...turns, { id: turnId, n: done + 1, trainee: msg, status: 'pending' }] });
      const first = await waitForTurn(turnId); // the customer reply comes first
      await run.reload();
      setBusy(false);
      if (first.turn.status === 'replied') { // the grade lands a moment later
        setGrading(turnId);
        await waitForTurn(turnId, { grade: true }).catch(() => {});
        await run.reload();
        setGrading(null);
      }
    } catch (e) { setErr(e.message); setBusy(false); }
  };
  const end = async () => { if (confirm('End this practice run and see the real ticket?')) { await call('endRun', { runId }); await run.reload(); } };

  return (
    <div className="run">
      <div className="banner" role="note">{preview ? 'Lead preview: testing the AI customer. Replies are not graded.' : 'Practice: not a real customer. Nothing here touches the live queue.'}</div>
      <div className="run-grid">
        <main className="ticket">
          <header className="ticket-head">
            <div>
              <div className="muted small">{r.case.requestType}</div>
              <h1>{r.case.summary}</h1>
              <div className="muted small">Raised by {r.case.customerName} · {preview ? 'preview' : `reply ${Math.min(done + (active ? 1 : 0), r.turnLimit)} of ${r.turnLimit}`}</div>
            </div>
            <div className="ticket-meta">
              <Lozenge tone={statusTone(r.status)}>{STATUS_LABEL[r.status]}</Lozenge>
              <div className="sla"><span className="muted small">Time to resolution</span><Clock since={r.startedAt} stopped={r.endedAt} /></div>
            </div>
          </header>

          <ol className="thread" aria-live="polite">
            <li className="msg customer"><div className="who">{r.case.customerName}</div><div className="body">{r.case.opening}</div></li>
            {visible.map((t) => (
              <TurnItem key={t.id} t={t} customer={r.case.customerName} preview={preview} grading={!preview && t.status === 'replied'} />
            ))}
            {busy && <li className="msg customer typing"><div className="who">{r.case.customerName}</div><div className="body"><span className="dots"><i /><i /><i /></span></div></li>}
            <li ref={bottom} />
          </ol>

          {active ? (
            <div className="composer">
              <label htmlFor="reply" className="sr-only">Your reply to the customer</label>
              <textarea id="reply" value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply to the customer…" rows={4} disabled={busy}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }} />
              <ErrorBox error={err} />
              <div className="composer-bar">
                <span className="muted small">Ctrl+Enter to send</span>
                <div className="row">
                  <button onClick={end} disabled={busy}>End run</button>
                  <button className="primary" onClick={send} disabled={busy || !text.trim()}>{busy ? 'Customer is answering…' : 'Send reply'}</button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`outcome ${r.status}`}>
              <div>{OUTCOME[r.status] || 'This run has ended.'}</div>
              <div className="row">
                {!preview && <button className="primary" onClick={() => go('debrief', { runId })}>See the real ticket</button>}
                <button onClick={() => go(preview ? 'back' : 'home')}>{preview ? 'Back to the case' : 'Back to practice'}</button>
              </div>
            </div>
          )}
        </main>
        <KbPanel runId={runId} />
      </div>
    </div>
  );
}

function TurnItem({ t, customer, preview, grading }) {
  return (
    <>
      <li className="msg agent">
        <div className="who">You {t.mark && <Mark mark={t.mark} />}</div>
        <div className="body">{t.trainee}</div>
        {t.grade && <div className="grade-in"><GradeLines grade={t.grade} mark={t.mark} /></div>}
        {grading && <div className="grading muted small" role="status"><span className="dots"><i /><i /><i /></span> Checking your reply against the KB and SOPs</div>}
        {t.status === 'failed' && <div className="error-box">{t.error}</div>}
      </li>
      {(t.status === 'done' || t.status === 'replied') && (
        <li className="msg customer">
          <div className="who">{customer}{t.verdict === 'solved' && <Lozenge tone="good">Fixed</Lozenge>}{t.verdict === 'made_worse' && <Lozenge tone="bad">Worse</Lozenge>}</div>
          <div className="body">{t.reply}</div>
          {preview && t.released && <div className="muted small">Facts given this turn: {t.released.length ? t.released.join(', ') : 'none'}</div>}
        </li>
      )}
    </>
  );
}

function KbPanel({ runId }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState(null);
  const [article, setArticle] = useState(null);
  const [err, setErr] = useState(null);
  const search = async (e) => {
    e?.preventDefault();
    setErr(null); setArticle(null);
    try { setHits(await call('searchKb', { runId, q })); } catch (x) { setErr(x.message); }
  };
  useEffect(() => { search(); }, [runId]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = async (id) => { try { setArticle(await call('kbArticle', { runId, id })); } catch (x) { setErr(x.message); } };
  return (
    <aside className="kb panel">
      <h3>Knowledge base</h3>
      <form onSubmit={search} className="row">
        <label htmlFor="kbq" className="sr-only">Search the knowledge base</label>
        <input id="kbq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles" />
        <button type="submit">Search</button>
      </form>
      <ErrorBox error={err} />
      {article ? (
        <div className="article">
          <button className="link" onClick={() => setArticle(null)}>← Results</button>
          <h4>{article.title}</h4>
          <div className="article-body">{article.body}</div>
        </div>
      ) : (
        <ul className="plain kb-hits">
          {(hits || []).map((h) => (
            <li key={h.id}><button className="link" onClick={() => open(h.id)}>{h.title}</button><div className="muted small">{h.excerpt}</div></li>
          ))}
          {hits && !hits.length && <li className="muted">No articles found.</li>}
        </ul>
      )}
    </aside>
  );
}
