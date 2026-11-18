const fs = require('fs');
const path = require('path');
const config = require('../config');

// Determine database type: PostgreSQL (Netlify Database / Neon) vs SQLite (Local / Fallback)
const pgConnectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
const isPostgres = Boolean(pgConnectionString);

let dbAsync;
let initSchema;

if (isPostgres) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: pgConnectionString,
    ssl: { rejectUnauthorized: false }
  });

  // Query transformer: translates SQLite-style queries with '?' to Postgres '$1, $2, ...'
  function translateQuery(sql) {
    let pgSql = sql;

    // Replace INSERT OR IGNORE INTO <table> with INSERT INTO <table> ... ON CONFLICT DO NOTHING
    if (/INSERT\s+OR\s+IGNORE\s+INTO/i.test(pgSql)) {
      pgSql = pgSql.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
      if (!/ON\s+CONFLICT/i.test(pgSql)) {
        pgSql += ' ON CONFLICT DO NOTHING';
      }
    }

    // Replace ? placeholders with $1, $2, $3...
    let idx = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${idx++}`);

    return pgSql;
  }

  dbAsync = {
    async get(sql, params = []) {
      const pgSql = translateQuery(sql);
      const res = await pool.query(pgSql, params);
      return res.rows[0] || null;
    },

    async all(sql, params = []) {
      const pgSql = translateQuery(sql);
      const res = await pool.query(pgSql, params);
      return res.rows || [];
    },

    async run(sql, params = []) {
      let pgSql = translateQuery(sql);

      // If an INSERT statement doesn't have RETURNING id, append it to get lastID
      const isInsert = /^\s*INSERT\s+INTO/i.test(pgSql);
      if (isInsert && !/RETURNING/i.test(pgSql) && !/ON\s+CONFLICT\s+DO\s+NOTHING/i.test(pgSql)) {
        pgSql += ' RETURNING id';
      }

      const res = await pool.query(pgSql, params);
      return {
        lastID: res.rows?.[0]?.id || null,
        changes: res.rowCount
      };
    },

    async exec(sql) {
      await pool.query(sql);
    },

    raw: pool,
    isPostgres: true
  };

  initSchema = async () => {
    try {
      const schemaPath = path.join(__dirname, 'schema.postgres.sql');
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await dbAsync.exec(sql);
      console.log('✓ PostgreSQL schema verified/initialized successfully on Netlify Database.');

      // Check if products need seeding
      const prodCount = await dbAsync.get('SELECT COUNT(*) as count FROM products');
      if (!prodCount || Number(prodCount.count) === 0) {
        console.log('PostgreSQL database empty, running initial seeds...');
        const seedService = require('./seed');
        if (typeof seedService === 'function') await seedService();
        else if (typeof seedService.seed === 'function') await seedService.seed();
      }
    } catch (err) {
      console.error('Error initializing PostgreSQL schema:', err);
    }
  };

} else {
  // SQLite Implementation
  const sqlite3 = require('sqlite3').verbose();
  const dbDir = path.dirname(config.DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new sqlite3.Database(config.DB_PATH, (err) => {
    if (err) {
      console.error('Failed to connect to SQLite database:', err.message);
    } else {
      db.run('PRAGMA foreign_keys = ON;');
    }
  });

  dbAsync = {
    get(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    },

    all(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    },

    run(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    },

    exec(sql) {
      return new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },

    raw: db,
    isPostgres: false
  };

  initSchema = async () => {
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await dbAsync.exec(sql);
      console.log('✓ SQLite schema verified/initialized successfully.');
    } catch (err) {
      console.error('Error initializing schema:', err);
    }
  };
}

module.exports = {
  db: dbAsync,
  initSchema
};
