// 轻量 SQLite 封装 (基于 sql.js,纯 JS,免编译)
// 数据持久化到 data/directory.db
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'directory.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let SQL = null;
let db = null;

// 把 sql.js Database 适配成简单的 query/all/get/run 接口
// 支持两种参数风格:
//   1. 命名参数:SQL 里写 @name(可重复),调用时传对象 { name: value }
//   2. 位置参数:SQL 里写 ?,调用时传数组 [v1, v2, ...]
// 内部统一转 sql.js 期望的数组形式
function extractNamedInOrder(sql) {
  // 按出现顺序返回所有 @name(同名重复也保留)
  const names = [];
  const re = /@([A-Za-z_][A-Za-z0-9_]*)/g;
  let m;
  while ((m = re.exec(sql)) !== null) names.push(m[1]);
  return names;
}

function wrap(rawDb) {
  function save() {
    const data = Buffer.from(rawDb.export());
    fs.writeFileSync(DB_PATH, data);
  }
  return {
    exec(sql) { rawDb.exec(sql); save(); },
    prepare(sql) {
      const namedOrder = extractNamedInOrder(sql);
      // 把 SQL 中的 @xxx 替换成 ?,生成位置参数版本
      const positionalSql = sql.replace(/@[A-Za-z_][A-Za-z0-9_]*/g, '?');
      // 计算 ? 总数
      const placeholderCount = (positionalSql.match(/\?/g) || []).length;

      function buildArray(params) {
        if (namedOrder.length) {
          // 命名参数:按出现顺序展开为数组
          return namedOrder.map((n) => (params && n in params ? params[n] : null));
        }
        // 位置参数
        if (Array.isArray(params)) return params.map((v) => (v !== undefined ? v : null));
        return [params];
      }

      return {
        get(params) {
          const stmt = rawDb.prepare(positionalSql);
          try {
            if (placeholderCount > 0) stmt.bind(buildArray(params));
            if (stmt.step()) return stmt.getAsObject();
            return undefined;
          } finally { stmt.free(); }
        },
        all(params) {
          const stmt = rawDb.prepare(positionalSql);
          const out = [];
          try {
            if (placeholderCount > 0) stmt.bind(buildArray(params));
            while (stmt.step()) out.push(stmt.getAsObject());
            return out;
          } finally { stmt.free(); }
        },
        run(params) {
          const stmt = rawDb.prepare(positionalSql);
          try {
            if (placeholderCount > 0) stmt.bind(buildArray(params));
            stmt.step();
            const idRes = rawDb.exec('SELECT last_insert_rowid() AS id');
            const lastId = idRes.length ? idRes[0].values[0][0] : null;
            const chRes = rawDb.exec('SELECT changes() AS c');
            const changes = chRes.length ? chRes[0].values[0][0] : 0;
            save();
            return { lastInsertRowid: lastId, changes };
          } finally { stmt.free(); }
        },
      };
    },
  };
}

async function init() {
  SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = wrap(new SQL.Database(buf));
  } else {
    db = wrap(new SQL.Database());
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_no TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      position TEXT,
      mobile TEXT,
      email TEXT,
      extension TEXT,
      office_location TEXT,
      hire_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_emp_name ON employees(name);
    CREATE INDEX IF NOT EXISTS idx_emp_dept ON employees(department);

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);
}

module.exports = {
  ready: init(),
  get db() { return db; },
};
