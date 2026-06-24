require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const dbModule = require('./db');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

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

  // 首次启动可选种入示例数据(部署到 Render 时由 SEED_ON_BOOT 控制)
  if (process.env.SEED_ON_BOOT === 'true') {
    try {
      const count = db.prepare('SELECT COUNT(*) AS c FROM employees').get().c;
      if (count === 0) {
        console.log('[seed] 数据库为空,自动写入示例员工...');
        const sample = [
          { employee_no: 'E001', name: '张伟',  department: '总裁办',     position: '总裁',     mobile: '13800000001', email: 'zhangwei@example.com',  extension: '8001', office_location: '北京-总部-18F',  hire_date: '2010-03-15', notes: '' },
          { employee_no: 'E002', name: '王芳',  department: '总裁办',     position: '副总裁',   mobile: '13800000002', email: 'wangfang@example.com',  extension: '8002', office_location: '北京-总部-18F',  hire_date: '2012-07-01', notes: '' },
          { employee_no: 'E003', name: '李娜',  department: '人力资源部', position: 'HR 经理',  mobile: '13800000003', email: 'lina@example.com',      extension: '8101', office_location: '北京-总部-15F',  hire_date: '2015-09-10', notes: '' },
          { employee_no: 'E004', name: '刘强',  department: '财务部',     position: 'CFO',      mobile: '13800000004', email: 'liuqiang@example.com',  extension: '8201', office_location: '北京-总部-15F',  hire_date: '2014-01-20', notes: '' },
          { employee_no: 'E005', name: '陈静',  department: '财务部',     position: '会计',     mobile: '13800000005', email: 'chenjing@example.com',  extension: '8202', office_location: '北京-总部-15F',  hire_date: '2018-05-12', notes: '' },
          { employee_no: 'E006', name: '杨洋',  department: '技术部',     position: 'CTO',      mobile: '13800000006', email: 'yangyang@example.com',  extension: '8301', office_location: '北京-总部-12F',  hire_date: '2013-04-08', notes: '技术总负责人' },
          { employee_no: 'E007', name: '赵磊',  department: '技术部',     position: '前端工程师', mobile: '13800000007', email: 'zhaolei@example.com', extension: '8302', office_location: '北京-总部-12F',  hire_date: '2020-06-15', notes: '' },
          { employee_no: 'E008', name: '孙婷',  department: '技术部',     position: '后端工程师', mobile: '13800000008', email: 'sunting@example.com', extension: '8303', office_location: '北京-总部-12F',  hire_date: '2019-11-20', notes: '' },
          { employee_no: 'E009', name: '周杰',  department: '产品部',     position: '产品经理', mobile: '13800000009', email: 'zhoujie@example.com',   extension: '8401', office_location: '北京-总部-12F',  hire_date: '2021-02-18', notes: '' },
          { employee_no: 'E010', name: '吴敏',  department: '市场部',     position: '市场总监', mobile: '13800000010', email: 'wumin@example.com',     extension: '8501', office_location: '上海-分部-22F',  hire_date: '2016-08-25', notes: '' },
          { employee_no: 'E011', name: '郑浩',  department: '市场部',     position: '市场专员', mobile: '13800000011', email: 'zhenghao@example.com',  extension: '8502', office_location: '上海-分部-22F',  hire_date: '2022-03-30', notes: '' },
          { employee_no: 'E012', name: '冯婷婷', department: '行政部',     position: '行政助理', mobile: '13800000012', email: 'fengtt@example.com',    extension: '8601', office_location: '北京-总部-15F',  hire_date: '2023-01-09', notes: '' },
        ];
        const ins = db.prepare(`
          INSERT OR IGNORE INTO employees
          (employee_no, name, department, position, mobile, email, extension, office_location, hire_date, notes)
          VALUES (@employee_no, @name, @department, @position, @mobile, @email, @extension, @office_location, @hire_date, @notes)
        `);
        let n = 0;
        for (const r of sample) { ins.run(r); n++; }
        console.log(`[seed] 写入 ${n} 条示例员工`);
      } else {
        console.log(`[seed] 已有 ${count} 条员工,跳过`);
      }
    } catch (e) {
      console.error('[seed error]', e.message);
    }
  }

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(path.join(__dirname, 'public')));

  // 全局错误处理:返回 JSON 错误详情(便于调试)
  app.use((err, req, res, next) => {
    console.error('[express error]', err.stack || err.message);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: err.message || 'Internal Server Error', stack: err.stack });
  });

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

  // ============== 管理员控制台 ==============
  // 这些接口需要登录(同 employees 的 authRequired),提供运维能力
  const SAMPLE = [
    { employee_no: 'E001', name: '张伟',  department: '总裁办',     position: '总裁',     mobile: '13800000001', email: 'zhangwei@example.com',  extension: '8001', office_location: '北京-总部-18F',  hire_date: '2010-03-15', notes: '' },
    { employee_no: 'E002', name: '王芳',  department: '总裁办',     position: '副总裁',   mobile: '13800000002', email: 'wangfang@example.com',  extension: '8002', office_location: '北京-总部-18F',  hire_date: '2012-07-01', notes: '' },
    { employee_no: 'E003', name: '李娜',  department: '人力资源部', position: 'HR 经理',  mobile: '13800000003', email: 'lina@example.com',      extension: '8101', office_location: '北京-总部-15F',  hire_date: '2015-09-10', notes: '' },
    { employee_no: 'E004', name: '刘强',  department: '财务部',     position: 'CFO',      mobile: '13800000004', email: 'liuqiang@example.com',  extension: '8201', office_location: '北京-总部-15F',  hire_date: '2014-01-20', notes: '' },
    { employee_no: 'E005', name: '陈静',  department: '财务部',     position: '会计',     mobile: '13800000005', email: 'chenjing@example.com',  extension: '8202', office_location: '北京-总部-15F',  hire_date: '2018-05-12', notes: '' },
    { employee_no: 'E006', name: '杨洋',  department: '技术部',     position: 'CTO',      mobile: '13800000006', email: 'yangyang@example.com',  extension: '8301', office_location: '北京-总部-12F',  hire_date: '2013-04-08', notes: '技术总负责人' },
    { employee_no: 'E007', name: '赵磊',  department: '技术部',     position: '前端工程师', mobile: '13800000007', email: 'zhaolei@example.com', extension: '8302', office_location: '北京-总部-12F',  hire_date: '2020-06-15', notes: '' },
    { employee_no: 'E008', name: '孙婷',  department: '技术部',     position: '后端工程师', mobile: '13800000008', email: 'sunting@example.com', extension: '8303', office_location: '北京-总部-12F',  hire_date: '2019-11-20', notes: '' },
    { employee_no: 'E009', name: '周杰',  department: '产品部',     position: '产品经理', mobile: '13800000009', email: 'zhoujie@example.com',   extension: '8401', office_location: '北京-总部-12F',  hire_date: '2021-02-18', notes: '' },
    { employee_no: 'E010', name: '吴敏',  department: '市场部',     position: '市场总监', mobile: '13800000010', email: 'wumin@example.com',     extension: '8501', office_location: '上海-分部-22F',  hire_date: '2016-08-25', notes: '' },
    { employee_no: 'E011', name: '郑浩',  department: '市场部',     position: '市场专员', mobile: '13800000011', email: 'zhenghao@example.com',  extension: '8502', office_location: '上海-分部-22F',  hire_date: '2022-03-30', notes: '' },
    { employee_no: 'E012', name: '冯婷婷', department: '行政部',     position: '行政助理', mobile: '13800000012', email: 'fengtt@example.com',    extension: '8601', office_location: '北京-总部-15F',  hire_date: '2023-01-09', notes: '' },
  ];

  // GET /api/admin/stats - 数据库状态
  app.get('/api/admin/stats', authRequired, (req, res) => {
    const empCount = db.prepare('SELECT COUNT(*) AS c FROM employees').get().c;
    const deptRows = db.prepare('SELECT COUNT(DISTINCT department) AS c FROM employees').get();
    const adminCount = db.prepare('SELECT COUNT(*) AS c FROM admins').get().c;
    const last = db.prepare("SELECT MAX(created_at) AS t FROM employees").get().t;
    let dbSize = 0;
    try {
      const fs = require('fs');
      const stat = fs.statSync(require('path').join(DATA_DIR, 'directory.db'));
      dbSize = stat.size;
    } catch {}
    res.json({
      employees: empCount,
      departments: deptRows.c,
      admins: adminCount,
      dbSizeBytes: dbSize,
      dbSizeKB: +(dbSize / 1024).toFixed(2),
      lastEmployeeAt: last,
      dataDir: DATA_DIR,
      nodeVersion: process.version,
      uptimeSec: Math.floor(process.uptime()),
    });
  });

  // POST /api/admin/change-password { newPassword } - 改当前管理员密码
  app.post('/api/admin/change-password', authRequired, (req, res) => {
    const np = (req.body && req.body.newPassword) || '';
    if (np.length < 6) return res.status(400).json({ error: '密码至少 6 位' });
    const hash = bcrypt.hashSync(np, 10);
    const info = db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, req.admin.id);
    if (!info.changes) return res.status(404).json({ error: '管理员不存在' });
    res.json({ ok: true, message: '密码已更新(注意:旧 token 仍有效至过期)' });
  });

  // POST /api/admin/reset { confirm: "DELETE" } - 清空所有员工
  app.post('/api/admin/reset', authRequired, (req, res) => {
    if ((req.body && req.body.confirm) !== 'DELETE') {
      return res.status(400).json({ error: '需要 confirm: "DELETE" 二次确认' });
    }
    const info = db.prepare('DELETE FROM employees').run();
    res.json({ ok: true, deleted: info.changes });
  });

  // POST /api/admin/reseed - 重新写入 12 条示例
  app.post('/api/admin/reseed', authRequired, (req, res) => {
    const ins = db.prepare(`
      INSERT OR IGNORE INTO employees
      (employee_no, name, department, position, mobile, email, extension, office_location, hire_date, notes)
      VALUES (@employee_no, @name, @department, @position, @mobile, @email, @extension, @office_location, @hire_date, @notes)
    `);
    let n = 0;
    for (const r of SAMPLE) { ins.run(r); n++; }
    res.json({ ok: true, seeded: n });
  });

  // GET /api/admin/backup - 导出整个 employees 表为 JSON
  app.get('/api/admin/backup', authRequired, (req, res) => {
    const rows = db.prepare('SELECT * FROM employees ORDER BY id').all();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="backup-${Date.now()}.json"`);
    res.json({ count: rows.length, exportedAt: new Date().toISOString(), employees: rows });
  });

  // POST /api/admin/restore { employees: [...] } - 从备份恢复(替换式)
  app.post('/api/admin/restore', authRequired, (req, res) => {
    const list = (req.body && req.body.employees) || [];
    if (!Array.isArray(list)) return res.status(400).json({ error: 'employees 必须是数组' });
    // sql.js 无原生 transaction,改用手动 catch + 整体回滚
    const snapshot = db.prepare('SELECT * FROM employees').all();
    try {
      db.prepare('DELETE FROM employees').run();
      const ins = db.prepare(`
        INSERT INTO employees
        (employee_no, name, department, position, mobile, email, extension, office_location, hire_date, notes)
        VALUES (@employee_no, @name, @department, @position, @mobile, @email, @extension, @office_location, @hire_date, @notes)
      `);
      let n = 0;
      for (const r of list) {
        ins.run({
          employee_no: r.employee_no, name: r.name, department: r.department,
          position: r.position || null, mobile: r.mobile || null, email: r.email || null,
          extension: r.extension || null, office_location: r.office_location || null,
          hire_date: r.hire_date || null, notes: r.notes || null,
        });
        n++;
      }
      res.json({ ok: true, restored: n });
    } catch (e) {
      // 回滚:重新插入旧数据
      try {
        db.prepare('DELETE FROM employees').run();
        const ins2 = db.prepare(`
          INSERT INTO employees
          (employee_no, name, department, position, mobile, email, extension, office_location, hire_date, notes)
          VALUES (@employee_no, @name, @department, @position, @mobile, @email, @extension, @office_location, @hire_date, @notes)
        `);
        for (const r of snapshot) {
          ins2.run({
            employee_no: r.employee_no, name: r.name, department: r.department,
            position: r.position, mobile: r.mobile, email: r.email,
            extension: r.extension, office_location: r.office_location,
            hire_date: r.hire_date, notes: r.notes,
          });
        }
      } catch (rollbackErr) {
        console.error('[restore rollback failed]', rollbackErr);
      }
      res.status(500).json({ error: '恢复失败: ' + e.message });
    }
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
