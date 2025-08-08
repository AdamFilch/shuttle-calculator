import * as SQLite from 'expo-sqlite';


const db = SQLite.openDatabaseSync('db.db');

export function setupDatabase() {
  db.withTransactionSync(() => {
    console.log('Setting up DB')
    db.execSync(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id INTEGER PRIMARY KEY NOT NULL,
        date TEXT NOT NULL
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS matches (
        match_id INTEGER PRIMARY KEY NOT NULL,
        session_id INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS match_users (
        match_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        PRIMARY KEY (match_id, user_id),
        FOREIGN KEY (match_id) REFERENCES matches(match_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS shuttles (
        shuttle_id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        unit_price REAL NOT NULL
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
        user_id INTEGER NOT NULL,
        amount_paid REAL NOT NULL,
        PRIMARY KEY (match_id, shuttle_id, user_id),
        FOREIGN KEY (match_id, shuttle_id) REFERENCES match_shuttles(match_id, shuttle_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      );
    `);
  });
}