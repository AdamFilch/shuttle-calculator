import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseAsync('shuttle.db');


export { db };
