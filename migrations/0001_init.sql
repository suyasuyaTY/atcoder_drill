CREATE TABLE contests (
  id                 TEXT PRIMARY KEY,       -- 'abc306'
  title              TEXT NOT NULL,
  start_epoch_second INTEGER NOT NULL,
  duration_second    INTEGER NOT NULL,
  kind               TEXT NOT NULL,          -- contestKind(id)
  synced_at          TEXT NOT NULL
);
CREATE INDEX contests_kind_start ON contests (kind, start_epoch_second DESC);

CREATE TABLE problems (
  id              TEXT PRIMARY KEY,          -- 'abc306_d'
  contest_id      TEXT NOT NULL,
  problem_index   TEXT NOT NULL,             -- 'D'、'Ex' など元の値
  index_norm      TEXT NOT NULL,             -- normalizeIndex() の結果
  kind            TEXT NOT NULL,             -- contestKind(contest_id)
  title           TEXT NOT NULL,
  difficulty      REAL,                      -- problem-models.json の生の値
  difficulty_disp INTEGER,                   -- 補正後の値（§10.1）。同期時に計算する
  is_experimental INTEGER NOT NULL DEFAULT 0,
  synced_at       TEXT NOT NULL
);
CREATE INDEX problems_contest ON problems (contest_id, problem_index);
CREATE INDEX problems_kind ON problems (kind, index_norm);

CREATE TABLE user_ac (
  problem_id  TEXT PRIMARY KEY,              -- 自分が AC した問題（§14.2）
  first_ac_at TEXT NOT NULL
);

CREATE TABLE profile (
  id              INTEGER PRIMARY KEY CHECK (id = 1),
  atcoder_user_id TEXT,
  fresh_targets   TEXT NOT NULL,             -- JSON: {"ABC":["F","G"],"ARC":[],"AGC":[],"OTHER":["dp","tdpc","typical90"]}
  min_difficulty  INTEGER,                   -- 補正後。NULL = 下限なし
  max_difficulty  INTEGER,                   -- 補正後、この値未満。NULL = 上限なし
  exclude_solved  INTEGER NOT NULL DEFAULT 1,
  fresh_quota     INTEGER NOT NULL DEFAULT 2 CHECK (fresh_quota BETWEEN 0 AND 3),
  updated_at      TEXT NOT NULL
);

CREATE TABLE cards (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  problem_id     TEXT NOT NULL UNIQUE,
  contest_id     TEXT NOT NULL,
  problem_index  TEXT NOT NULL,
  kind           TEXT NOT NULL,
  title          TEXT NOT NULL,              -- 登録時点のスナップショット
  difficulty     REAL,                       -- 同上。表示は problems 側を優先
  streak         INTEGER NOT NULL CHECK (streak IN (0, 1, 2)),
  next_review_at TEXT,                       -- 卒業したら NULL
  graduated_at   TEXT,
  first_grade    TEXT NOT NULL CHECK (first_grade IN ('easy', 'hard', 'failed')),
  origin         TEXT NOT NULL CHECK (origin IN ('register', 'fresh')),  -- 登録画面か、初見か
  created_at     TEXT NOT NULL,
  CHECK ((graduated_at IS NULL) = (next_review_at IS NOT NULL)),
  CHECK ((streak = 2) = (graduated_at IS NOT NULL))
);
CREATE INDEX cards_pool ON cards (kind, next_review_at) WHERE graduated_at IS NULL;
CREATE INDEX cards_contest ON cards (contest_id);

CREATE TABLE sessions (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  kind      TEXT NOT NULL,                   -- 'ABC' / 'ARC' / 'AGC' / 'OTHER' / 'ALL'
  drawn_at  TEXT NOT NULL,
  closed_at TEXT
);
CREATE UNIQUE INDEX sessions_one_open ON sessions ((closed_at IS NULL)) WHERE closed_at IS NULL;

CREATE TABLE session_items (
  session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  position   INTEGER NOT NULL,               -- 1..3
  problem_id TEXT NOT NULL,
  card_id    INTEGER REFERENCES cards (id) ON DELETE CASCADE,  -- 初見は申告するまで NULL
  PRIMARY KEY (session_id, position),
  UNIQUE (session_id, problem_id)
);

CREATE TABLE reg_sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  closed_at  TEXT
);
CREATE UNIQUE INDEX reg_sessions_one_open ON reg_sessions ((closed_at IS NULL)) WHERE closed_at IS NULL;

CREATE TABLE attempts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id        INTEGER NOT NULL REFERENCES cards (id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN ('register', 'fresh', 'review')),
  session_id     INTEGER REFERENCES sessions (id),       -- fresh / review のとき
  reg_session_id INTEGER REFERENCES reg_sessions (id),   -- register のとき
  attempted_at   TEXT NOT NULL,
  grade          TEXT NOT NULL CHECK (grade IN ('easy', 'hard', 'failed')),
  elapsed_sec    INTEGER,
  streak_before  INTEGER NOT NULL,           -- register / fresh は 0
  streak_after   INTEGER NOT NULL,
  next_review_at TEXT,                       -- この申告で決まった解禁日（卒業なら NULL）
  note           TEXT
);
CREATE INDEX attempts_card ON attempts (card_id, attempted_at);
CREATE INDEX attempts_time ON attempts (attempted_at);
CREATE UNIQUE INDEX attempts_once_per_session ON attempts (session_id, card_id) WHERE session_id IS NOT NULL;

CREATE TABLE app_meta (
  key   TEXT PRIMARY KEY,   -- 'problems_synced_at' / 'user_ac_synced_epoch' / 'debug_clock_offset_days'
  value TEXT NOT NULL
);
