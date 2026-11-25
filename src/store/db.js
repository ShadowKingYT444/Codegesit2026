// Storage. Forge SQL in production; node:sqlite in tests. The SQL stays portable: app-made ids, BIGINT
// millisecond times, no AUTO_INCREMENT, no ON DUPLICATE KEY. Big objects are JSON in LONGTEXT columns.
export const MIGRATIONS = [
  ['v001_tracks', `CREATE TABLE IF NOT EXISTS tracks (
    id VARCHAR(40) PRIMARY KEY, name VARCHAR(200) NOT NULL, source VARCHAR(20) NOT NULL, project_key VARCHAR(40),
    jql TEXT, settings_json LONGTEXT, sop_json LONGTEXT, kb_json LONGTEXT, status VARCHAR(20) NOT NULL,
    created_by VARCHAR(128), created_at BIGINT NOT NULL)`],
  ['v002_cases', `CREATE TABLE IF NOT EXISTS cases (
    id VARCHAR(40) PRIMARY KEY, track_id VARCHAR(40) NOT NULL, ticket_key VARCHAR(40) NOT NULL, request_type VARCHAR(200),
    summary VARCHAR(500), status VARCHAR(20) NOT NULL, score INT, case_json LONGTEXT, error TEXT, created_at BIGINT NOT NULL)`],
  ['v003_cases_idx', 'CREATE INDEX idx_cases_track ON cases (track_id)'],
  ['v004_assignments', `CREATE TABLE IF NOT EXISTS assignments (
    track_id VARCHAR(40) NOT NULL, account_id VARCHAR(128) NOT NULL, assigned_by VARCHAR(128), assigned_at BIGINT NOT NULL,
    PRIMARY KEY (track_id, account_id))`],
  ['v005_runs', `CREATE TABLE IF NOT EXISTS runs (
    id VARCHAR(40) PRIMARY KEY, case_id VARCHAR(40) NOT NULL, track_id VARCHAR(40) NOT NULL, account_id VARCHAR(128) NOT NULL,
    kind VARCHAR(20) NOT NULL, status VARCHAR(20) NOT NULL, state_json LONGTEXT, usage_json TEXT,
    started_at BIGINT NOT NULL, ended_at BIGINT)`],
  ['v006_runs_idx', 'CREATE INDEX idx_runs_account ON runs (account_id)'],
  ['v007_turns', `CREATE TABLE IF NOT EXISTS turns (
    id VARCHAR(40) PRIMARY KEY, run_id VARCHAR(40) NOT NULL, n INT NOT NULL, account_id VARCHAR(128) NOT NULL,
    request_type VARCHAR(200), trainee_msg TEXT NOT NULL, customer_reply TEXT, released_json TEXT, kind VARCHAR(30),
    verdict VARCHAR(20), grade_json TEXT, mark VARCHAR(10), status VARCHAR(20) NOT NULL, error TEXT, created_at BIGINT NOT NULL)`],
  ['v008_turns_idx', 'CREATE INDEX idx_turns_run ON turns (run_id)'],
  ['v009_turns_acct_idx', 'CREATE INDEX idx_turns_account ON turns (account_id, created_at)'],
  ['v010_overrides', `CREATE TABLE IF NOT EXISTS overrides (
    turn_id VARCHAR(40) PRIMARY KEY, lead_id VARCHAR(128) NOT NULL, note TEXT, created_at BIGINT NOT NULL)`],
  ['v011_readiness', `CREATE TABLE IF NOT EXISTS readiness (
    account_id VARCHAR(128) NOT NULL, track_id VARCHAR(40) NOT NULL, confirmed_by VARCHAR(128) NOT NULL, confirmed_at BIGINT NOT NULL,
    PRIMARY KEY (account_id, track_id))`],
];

/** driver: {query(sql, params) -> rows[], exec(sql, params) -> void, migrate(list) -> void} */
export function forgeSqlDriver(sqlModule, migrationRunner) {
  let migrated = false;
  return {
    async query(q, params = []) { return (await sqlModule.prepare(q).bindParams(...params).execute()).rows; },
    async exec(q, params = []) { await sqlModule.prepare(q).bindParams(...params).execute(); },
    async migrate(list) {
      if (migrated) return;
      let r = migrationRunner;
      for (const [name, stmt] of list) r = r.enqueue(name, stmt);
      await r.run();
      migrated = true;
    },
  };
}

export function sqliteDriver(DatabaseSync, file = ':memory:') {
  const db = new DatabaseSync(file);
  const done = new Set();
  return {
    db,
    async query(q, params = []) { return db.prepare(q).all(...params.map(fix)); },
    async exec(q, params = []) { db.prepare(q).run(...params.map(fix)); },
    async migrate(list) { for (const [name, stmt] of list) if (!done.has(name)) { db.exec(stmt.replace(/CREATE INDEX (\w+)/, 'CREATE INDEX IF NOT EXISTS $1')); done.add(name); } },
  };
}
const fix = (v) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : v);
