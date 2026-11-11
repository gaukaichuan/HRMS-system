const LOGIN_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{2,49}$/i;

function normalizeLoginId(value) {
  return value.trim().toLowerCase();
}

function fitsBcryptPassword(value) {
  return Buffer.byteLength(value, 'utf8') <= 72;
}

function migrateLoginIds(db) {
  db.transaction(() => {
    const columns = db.pragma('table_info(employees)');

    if (!columns.some((column) => column.name === 'login_id')) {
      db.exec(
        'ALTER TABLE employees ADD COLUMN login_id TEXT COLLATE NOCASE'
      );
    }

    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS employees_login_id_unique
        ON employees (login_id COLLATE NOCASE);

      UPDATE employees
      SET login_id = lower(trim(email))
      WHERE login_id IS NULL;
    `);
  })();
}

module.exports = {
  LOGIN_ID_PATTERN,
  normalizeLoginId,
  fitsBcryptPassword,
  migrateLoginIds
};
