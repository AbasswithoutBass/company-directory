require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const dbModule = require('./db');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

function adminExists(db) {
  return db.prepare('SELECT COUNT(*) AS c FROM admins').get().c > 0;
}
function createDefaultAdmin(db) {
  if (adminExists(db)) return;
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run([username, hash]);
  console.log(`[init] 默认管理员已创建 → 用户名: ${username}  密码: ${password}`);
}

async function main() {
  await dbModule.ready;
  const db = dbModule.db;
  try {
    createDefaultAdmin(db);
  } catch (e) {
    console.error('[init error]', e);
    throw e;
  }

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(path.join(__dirname, 'public')));

  function authRequired(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: '未登录' });
    try {
      req.admin = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      return res.status(401).json({ error: '登录已过期,请重新登录' });
    }
  }

  // ============ Auth ============
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' });
    const row = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    if (!row) return res.status(401).json({ error: '用户名或密码错误' });
    if (!bcrypt.compareSync(password, row.password_hash)) return res.status(401).json({ error: '用户名或密码错误' });
    const token = jwt.sign({ id: row.id, username: row.username }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, username: row.username });
  });

  app.get('/api/auth/me', authRequired, (req, res) => {
    res.json({ username: req.admin.username });
  });

  // ============ Employees ============
  app.get('/api/employees', (req, res) => {
    const { q = '', department = '', page = 1, pageSize = 50 } = req.query;
    const offset = (Math.max(1, +page) - 1) * +pageSize;
    const where = [];
    const params = {};
    if (q) {
      where.push('(name LIKE @q OR employee_no LIKE @q OR mobile LIKE @q OR email LIKE @q OR position LIKE @q)');
      params.q = `%${q}%`;
    }
    if (department) {
      where.push('department = @department');
      params.department = department;
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = db.prepare(`SELECT COUNT(*) AS c FROM employees ${whereSql}`).get(params).c;
    const rows = db.prepare(`
      SELECT id, employee_no, name, department, position, mobile, email, extension, office_location, hire_date, notes
      FROM employees ${whereSql}
      ORDER BY department, employee_no
      LIMIT @limit OFFSET @offset
    `).all({ ...params, limit: +pageSize, offset });

    res.json({ total, page: +page, pageSize: +pageSize, items: rows });
  });

  app.get('/api/employees/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: '员工不存在' });
    res.json(row);
  });

  app.get('/api/departments', (req, res) => {
    const rows = db.prepare(`
      SELECT department, COUNT(*) AS count
      FROM employees GROUP BY department ORDER BY department
    `).all();
    res.json(rows);
  });

  app.post('/api/employees', authRequired, (req, res) => {
    const b = req.body || {};
    if (!b.employee_no || !b.name || !b.department) {
      return res.status(400).json({ error: '工号、姓名、部门为必填项' });
    }
    try {
      const info = db.prepare(`
        INSERT INTO employees
          (employee_no, name, department, position, mobile, email, extension, office_location, hire_date, notes)
        VALUES
          (@employee_no, @name, @department, @position, @mobile, @email, @extension, @office_location, @hire_date, @notes)
      `).run({
        employee_no: b.employee_no, name: b.name, department: b.department,
        position: b.position || null, mobile: b.mobile || null, email: b.email || null,
        extension: b.extension || null, office_location: b.office_location || null,
        hire_date: b.hire_date || null, notes: b.notes || null,
      });
      res.json({ id: info.lastInsertRowid });
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: `工号 ${b.employee_no} 已存在` });
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/employees/:id', authRequired, (req, res) => {
    const id = req.params.id;
    const exists = db.prepare('SELECT id FROM employees WHERE id = ?').get(id);
    if (!exists) return res.status(404).json({ error: '员工不存在' });
    const b = req.body || {};
    if (!b.employee_no || !b.name || !b.department) {
      return res.status(400).json({ error: '工号、姓名、部门为必填项' });
    }
    try {
      db.prepare(`
        UPDATE employees SET
          employee_no=@employee_no, name=@name, department=@department, position=@position,
          mobile=@mobile, email=@email, extension=@extension,
          office_location=@office_location, hire_date=@hire_date, notes=@notes,
          updated_at = datetime('now','localtime')
        WHERE id=@id
      `).run({
        id, employee_no: b.employee_no, name: b.name, department: b.department,
        position: b.position || null, mobile: b.mobile || null, email: b.email || null,
        extension: b.extension || null, office_location: b.office_location || null,
        hire_date: b.hire_date || null, notes: b.notes || null,
      });
      res.json({ ok: true });
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: `工号 ${b.employee_no} 已存在` });
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/employees/:id', authRequired, (req, res) => {
    const info = db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: '员工不存在' });
    res.json({ ok: true });
  });

  app.get('/api/export', (req, res) => {
    const rows = db.prepare(`
      SELECT employee_no, name, department, position, mobile, email, extension, office_location, hire_date, notes
      FROM employees ORDER BY department, employee_no
    `).all();
    const headers = ['工号', '姓名', '部门', '职位', '手机', '邮箱', '分机', '办公地点', '入职日期', '备注'];
    const esc = (v) => {
      if (v == null) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const csv = [headers.join(',')]
      .concat(rows.map((r) => [r.employee_no, r.name, r.department, r.position, r.mobile, r.email, r.extension, r.office_location, r.hire_date, r.notes].map(esc).join(',')))
      .join('\n');
    const buf = Buffer.from('\uFEFF' + csv, 'utf8');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="employees-${Date.now()}.csv"`);
    res.send(buf);
  });

  app.listen(PORT, () => {
    console.log(`\n  企业通讯录名册已启动`);
    console.log(`  ➜  访问 http://localhost:${PORT}`);
    console.log(`  ➜  管理后台 http://localhost:${PORT}/admin.html\n`);
  });
}

main().catch((e) => {
  console.error('[fatal]', e);
  process.exit(1);
});
