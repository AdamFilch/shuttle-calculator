import * as SQLite from 'expo-sqlite';

export async function debugDatabase() {
  const db = await SQLite.openDatabaseSync('db.db');
  const res = await db.getAllAsync(`SELECT name, sql FROM sqlite_master WHERE type='table'`);
  // console.log(res)
}

export async function dropDatabase() {
  const db = await SQLite.openDatabaseSync('db.db');

  await db.execAsync(`
  DROP TABLE IF EXISTS sessions;
  DROP TABLE IF EXISTS players;
  DROP TABLE IF EXISTS matches;
  DROP TABLE IF EXISTS match_players;
  DROP TABLE IF EXISTS shuttles;
  DROP TABLE IF EXISTS match_shuttles;
  DROP TABLE IF EXISTS shuttle_payments;
`);

}

export async function setupDatabase() {
  const db = await SQLite.openDatabaseSync('db.db');
  db.withTransactionSync(() => {
    console.log('Setting up DB')
    db.execSync(`
      CREATE TABLE IF NOT EXISTS players (
        player_id INTEGER PRIMARY KEY NOT NULL,
        date TIMESTAMP NOT NULL DEFAULT (datetime('now')),
        name TEXT NOT NULL
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id INTEGER PRIMARY KEY NOT NULL,
        name TEXT,
        date TIMESTAMP NOT NULL DEFAULT (datetime('now')) 
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS matches (
        match_id INTEGER PRIMARY KEY NOT NULL,
        session_id INTEGER NOT NULL,
        date TIMESTAMP NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS match_players (
        match_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        position INTEGER NOT NULL,
        PRIMARY KEY (match_id, player_id),
        FOREIGN KEY (match_id) REFERENCES matches(match_id),
        FOREIGN KEY (player_id) REFERENCES players(player_id)
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS shuttles (
        shuttle_id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        total_price REAL NOT NULL,
        num_of_shuttles INTEGER NOT NULL
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS match_shuttles (
        match_id INTEGER NOT NULL,
        shuttle_id INTEGER NOT NULL,
        quantity_used INTEGER NOT NULL,
        PRIMARY KEY (match_id, shuttle_id),
        FOREIGN KEY (match_id) REFERENCES matches(match_id),
        FOREIGN KEY (shuttle_id) REFERENCES shuttles(shuttle_id)
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS shuttle_payments (
        match_id INTEGER NOT NULL,
        shuttle_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        amount_paid REAL NOT NULL,
        date_paid TIMESTAMP,
        date_created TIMESTAMP NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (match_id, shuttle_id, player_id),
        FOREIGN KEY (match_id, shuttle_id) REFERENCES match_shuttles(match_id, shuttle_id),
        FOREIGN KEY (player_id) REFERENCES players(player_id)
      );
    `)

    db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_match_players_player ON match_players(player_id);
      CREATE INDEX IF NOT EXISTS idx_match_players_match ON match_players(match_id);
      CREATE INDEX IF NOT EXISTS idx_match_shuttles_match ON match_shuttles(match_id);
      CREATE INDEX IF NOT EXISTS idx_match_shuttles_shuttle ON match_shuttles(shuttle_id);
      CREATE INDEX IF NOT EXISTS idx_shuttle_payments_players ON shuttle_payments(player_id);
      CREATE INDEX IF NOT EXISTS idx_shuttle_payments_match ON shuttle_payments(match_id);
    `);

  });
}