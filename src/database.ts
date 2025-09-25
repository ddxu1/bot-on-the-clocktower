// Simple SQLite Database for Game State
import sqlite3 from 'sqlite3';
import { GameState, GameAction } from './types';

export class GameDatabase {
  private db: sqlite3.Database;

  constructor(dbPath: string = './clocktower.db') {
    this.db = new sqlite3.Database(dbPath);
    this.initializeTables();
  }

  private initializeTables(): void {
    const createTables = `
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS game_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (game_id) REFERENCES games (id)
      );
    `;

    this.db.exec(createTables, (err) => {
      if (err) {
        console.error('Failed to create tables:', err);
      } else {
        console.log('✅ Database initialized');
      }
    });
  }

  async saveGame(gameState: GameState): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO games (id, state, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(
        gameState.id,
        JSON.stringify(gameState),
        gameState.created_at,
        gameState.updated_at,
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
      stmt.finalize();
    });
  }

  async loadGame(gameId: string): Promise<GameState | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT state FROM games WHERE id = ?',
        [gameId],
        (err, row: any) => {
          if (err) {
            reject(err);
          } else if (row) {
            resolve(JSON.parse(row.state));
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  async saveAction(action: GameAction): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO game_actions (game_id, type, payload, timestamp)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(
        action.game_id,
        action.type,
        JSON.stringify(action.payload),
        action.timestamp,
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
      stmt.finalize();
    });
  }

  async getGameHistory(gameId: string): Promise<GameAction[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM game_actions WHERE game_id = ? ORDER BY timestamp',
        [gameId],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const actions = rows.map(row => ({
              type: row.type,
              payload: JSON.parse(row.payload),
              game_id: row.game_id,
              timestamp: row.timestamp
            }));
            resolve(actions);
          }
        }
      );
    });
  }

  async getAllGames(): Promise<GameState[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT state FROM games ORDER BY updated_at DESC',
        [],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const games = rows.map(row => JSON.parse(row.state));
            resolve(games);
          }
        }
      );
    });
  }

  close(): void {
    this.db.close();
  }
}