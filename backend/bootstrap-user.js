const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const { z } = require('zod');
require('dotenv').config();

const credentials = z.object({
  email: z.string().email().max(254),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(12).max(200)
}).safeParse({
  email: process.env.HRMS_BOOTSTRAP_EMAIL,
  name: process.env.HRMS_BOOTSTRAP_NAME,
  password: process.env.HRMS_BOOTSTRAP_PASSWORD
});

if (!credentials.success) {
  console.error(
    'Set HRMS_BOOTSTRAP_EMAIL, HRMS_BOOTSTRAP_NAME, and a password of at least 12 characters in backend/.env.'
  );
  process.exit(1);
}

const dbPath = process.env.DATABASE_PATH || './data/hrms.sqlite';
const path = require('node:path');
const fs = require('node:fs');
const resolvedPath = path.resolve(__dirname, dbPath);
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const db = new Database(resolvedPath);
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee'
      CHECK (role IN ('employee', 'admin')),
    active INTEGER NOT NULL DEFAULT 1
      CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL
  );
`);

const email = credentials.data.email.trim().toLowerCase();
const existing = db.prepare(
  'SELECT id FROM employees WHERE email = ?'
).get(email);

if (existing) {
  console.error('An account with that email already exists.');
  db.close();
  process.exit(1);
}

const id = require('node:crypto').randomUUID();
const passwordHash = bcrypt.hashSync(credentials.data.password, 12);

db.prepare(`
  INSERT INTO employees (id, email, display_name, password_hash, role, created_at)
  VALUES (?, ?, ?, ?, 'admin', ?)
`).run(
  id,
  email,
  credentials.data.name.trim(),
  passwordHash,
  new Date().toISOString()
);

console.log(`Created initial admin account: ${email}`);
db.close();
