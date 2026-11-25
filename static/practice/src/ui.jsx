// Small shared pieces.
import { useEffect, useState } from 'react';

export const ERROR_LABEL = {
  wrong_fix: 'Wrong fix', skipped_required_step: 'Skipped required step', asked_known_info: 'Asked for known information',
  unauthorized_promise: 'Promise above the limit', missing_needed_question: 'Missing needed question', leaked_internal: 'Internal leak', tone: 'Tone',
};
const MINOR = ['tone', 'asked_known_info', 'missing_needed_question'];
export const STATUS_LABEL = { active: 'In progress', solved: 'Solved', ended: 'Ended', limit: 'Turn limit', queued: 'Queued', building: 'Building', ready: 'Ready', failed: 'Failed', skipped: 'Skipped', removed: 'Removed' };

export function useLoad(fn, deps = []) {
  const [state, set] = useState({ loading: true, data: null, error: null });
  const reload = async () => {
    set((s) => ({ ...s, loading: true }));
    try { set({ loading: false, data: await fn(), error: null }); } catch (e) { set({ loading: false, data: null, error: e.message }); }
  };
  useEffect(() => { reload(); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload, setData: (d) => set((s) => ({ ...s, data: d })) };
}

export const Spinner = ({ label = 'Loading' }) => <div className="muted pad" role="status"><span className="spin" aria-hidden /> {label}…</div>;
export const ErrorBox = ({ error, onRetry }) => (error ? <div className="error-box" role="alert">{error}{onRetry && <button className="link" onClick={onRetry}>Try again</button>}</div> : null);
export const Lozenge = ({ tone = 'neutral', children }) => <span className={`lozenge ${tone}`}>{children}</span>;
export const statusTone = (s) => ({ solved: 'good', ready: 'good', active: 'info', building: 'info', queued: 'info', failed: 'bad', limit: 'warn', skipped: 'warn', removed: 'neutral', ended: 'neutral' }[s] || 'neutral');
export const Mark = ({ mark }) => (mark && mark !== 'none' ? <span className={`mark ${mark}`} title={{ green: 'Good reply', amber: 'One minor issue', red: 'Needs work' }[mark]} aria-label={mark} /> : null);
export const pct = (x) => (x == null ? '–' : `${x}%`);
export const ago = (ms) => { const s = Math.round((Date.now() - ms) / 1000); if (s < 60) return 'just now'; if (s < 3600) return `${Math.round(s / 60)} min ago`; if (s < 86400) return `${Math.round(s / 3600)} h ago`; return `${Math.round(s / 86400)} d ago`; };
export const dollars = (u) => `$${((u.input * 3 + u.output * 15) / 1e6).toFixed(2)}`;

export function Clock({ since, stopped }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (stopped) return undefined; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [stopped]);
  const s = Math.max(0, Math.floor(((stopped || now) - since) / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0'), mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0'), ss = String(s % 60).padStart(2, '0');
  return <span className="clock" title="Time since the customer wrote">{hh}:{mm}:{ss}</span>;
}

export function GradeLines({ grade, mark }) {
  if (!grade) return null;
  return (
    <div className={`grade ${mark || ''}`}>
      {grade.errors.length === 0 && <div className="grade-line good"><Mark mark="green" /> <span>{grade.good || 'Good reply.'}</span></div>}
      {grade.errors.map((e) => (
        <div key={e.type} className="grade-line">
          <Mark mark={MINOR.includes(e.type) ? 'amber' : 'red'} />
          <div><strong>{ERROR_LABEL[e.type] || e.type}</strong>{e.quote && <> · “{e.quote}”</>}{e.source && <div className="source">{e.source}</div>}</div>
        </div>
      ))}
      {grade.errors.length > 0 && grade.good && <div className="grade-line muted">Good: {grade.good}</div>}
    </div>
  );
}

export function Empty({ title, children }) {
  return <div className="empty"><div className="empty-title">{title}</div><div className="muted">{children}</div></div>;
}
