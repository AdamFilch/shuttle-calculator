
CREATE TABLE users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NULL
);

CREATE TABLE sessions (
  session_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NULL
  date TEXT NOT NULL
);

CREATE TABLE matches (
  match_id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

CREATE TABLE match_users (
  match_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  PRIMARY KEY (match_id, user_id),
  FOREIGN KEY (match_id) REFERENCES matches(match_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Shuttle catalog: define types of shuttles
CREATE TABLE shuttles (
  shuttle_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  total_price REAL NOT NULL
  num_of_shuttles INTEGER NOT NULL
);

-- Shuttle usage in a match
CREATE TABLE match_shuttles (
  match_id INTEGER NOT NULL,
  shuttle_id INTEGER NOT NULL,
  quantity_used INTEGER NOT NULL,
  PRIMARY KEY (match_id, shuttle_id),
  FOREIGN KEY (match_id) REFERENCES matches(match_id),
  FOREIGN KEY (shuttle_id) REFERENCES shuttles(shuttle_id)
);

-- Who paid for what
CREATE TABLE shuttle_payments (
  match_id INTEGER NOT NULL,
  shuttle_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  amount_paid REAL NOT NULL,
  PRIMARY KEY (match_id, shuttle_id, user_id),
  FOREIGN KEY (match_id, shuttle_id) REFERENCES match_shuttles(match_id, shuttle_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
