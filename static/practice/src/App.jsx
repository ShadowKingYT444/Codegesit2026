// Ride-Along shell: tabs, a small navigation stack and the practice banner.
import { useEffect, useState } from 'react';
import { call, moduleKey } from './api.js';
import { Spinner, ErrorBox } from './ui.jsx';
import Home from './Home.jsx';
import Run from './Run.jsx';
import Debrief from './Debrief.jsx';
import Tracks from './Tracks.jsx';
import Track from './Track.jsx';
import Case from './Case.jsx';
import Team, { Trainee } from './Team.jsx';
import Settings from './Settings.jsx';

const TABS = [
  { id: 'home', label: 'Practice', lead: false },
  { id: 'tracks', label: 'Tracks', lead: true },
  { id: 'team', label: 'Team', lead: true },
  { id: 'settings', label: 'Settings', lead: true },
];
const TAB_OF = { home: 'home', run: 'home', debrief: 'home', tracks: 'tracks', track: 'tracks', case: 'tracks', preview: 'tracks', team: 'team', trainee: 'team', settings: 'settings' };

export default function App() {
  const [ctx, setCtx] = useState(null);
  const [err, setErr] = useState(null);
  const [stack, setStack] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const [c, mk] = await Promise.all([call('context'), moduleKey()]);
        setCtx(c);
        setStack([{ name: mk === 'ride-along-lead-page' && c.isLead ? 'team' : 'home', params: {} }]);
      } catch (e) { setErr(e.message); }
    })();
  }, []);
  if (err) return <div className="app"><ErrorBox error={err} /></div>;
  if (!ctx || !stack.length) return <div className="app"><Spinner label="Starting Ride-Along" /></div>;

  const cur = stack[stack.length - 1];
  const go = (name, params = {}) => {
    if (name === 'back') { setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)); return; }
    if (TABS.some((t) => t.id === name)) { setStack([{ name, params }]); return; }
    setStack((s) => [...s, { name, params }]);
  };
  const p = cur.params;
  let view;
  switch (cur.name) {
    case 'run': view = <Run key={p.runId} runId={p.runId} go={go} />; break;
    case 'preview': view = <Run key={p.runId} runId={p.runId} go={go} preview />; break;
    case 'debrief': view = <Debrief runId={p.runId} go={go} lead={!!p.lead} />; break;
    case 'tracks': view = <Tracks go={go} ctx={ctx} />; break;
    case 'track': view = <Track trackId={p.trackId} go={go} />; break;
    case 'case': view = <Case caseId={p.caseId} go={go} />; break;
    case 'team': view = <Team go={go} />; break;
    case 'trainee': view = <Trainee accountId={p.accountId} name={p.name} go={go} />; break;
    case 'settings': view = <Settings />; break;
    default: view = <Home go={go} ctx={ctx} />;
  }
  return (
    <div className="app">
      <nav className="topbar" aria-label="Ride-Along">
        <div className="brand"><span className="logo" aria-hidden>◐</span> Ride-Along</div>
        <div className="tabs" role="tablist">
          {TABS.filter((t) => !t.lead || ctx.isLead).map((t) => (
            <button key={t.id} role="tab" aria-selected={TAB_OF[cur.name] === t.id} className={`tab ${TAB_OF[cur.name] === t.id ? 'on' : ''}`} onClick={() => go(t.id)}>{t.label}</button>
          ))}
        </div>
      </nav>
      <div className="content">{view}</div>
    </div>
  );
}
