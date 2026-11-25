// Lead settings, stored in Forge KVS.
import { useState } from 'react';
import { call } from './api.js';
import { useLoad, Spinner, ErrorBox } from './ui.jsx';

const FIELDS = [
  ['leadGroup', 'Lead group', 'Members can build tracks and see every trainee. Jira admins are always leads.'],
  ['kbSpaceKey', 'KB space key', 'Confluence space with your KB articles, for KB search and grading.'],
  ['sopLabel', 'SOP label', 'Confluence label that marks SOP pages.'],
  ['sopSpaceKey', 'SOP space key', 'Leave empty to use the KB space.'],
  ['model', 'Model', 'Forge LLM model id, for example claude-sonnet-4-6.'],
  ['turnLimit', 'Turn limit', 'A run ends after this many trainee replies.'],
  ['retentionDays', 'Keep practice runs (days)', 'Older runs are deleted every day.'],
  ['maxCasesPerTrack', 'Max cases per track', 'Each case costs a few model calls to build.'],
  ['sensitiveTypes', 'Extra sensitive request types', 'Comma separated. Excluded unless a lead allows them for a track.'],
  ['keepTerms', 'Never replace these terms', 'Comma separated product or system names the cleaning step must keep.'],
];

export default function Settings() {
  const s = useLoad(() => call('getSettings'));
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  if (s.loading && !s.data) return <Spinner />;
  if (s.error) return <ErrorBox error={s.error} onRetry={s.reload} />;
  const v = form || s.data;
  const set = (k, val) => setForm({ ...v, [k]: val });
  const save = async () => { setErr(null); try { const r = await call('saveSettings', { settings: v }); setForm(r); setMsg('Saved.'); } catch (e) { setErr(e.message); } };
  return (
    <div className="stack narrow">
      <h1>Settings</h1>
      <div className="panel form">
        {FIELDS.map(([k, label, help]) => (
          <label key={k}>{label}
            <input value={Array.isArray(v[k]) ? v[k].join(', ') : v[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
            <span className="muted small">{help}</span>
          </label>
        ))}
        <ErrorBox error={err} />
        <div className="row"><button className="primary" onClick={save}>Save settings</button>{msg && <span className="muted">{msg}</span>}</div>
      </div>
    </div>
  );
}
