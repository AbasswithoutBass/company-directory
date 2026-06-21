// 一次性冒烟测试:启动服务、跑接口验证、关闭服务
// 使用: node smoke.js
const { spawn } = require('child_process');
const path = require('path');

const PORT = 3399;
const env = { ...process.env, PORT: String(PORT), JWT_SECRET: 'test-secret-key-12345', ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'admin123' };

const child = spawn(process.execPath, ['server.js'], { cwd: __dirname, env, stdio: ['ignore', 'pipe', 'pipe'] });
let ready = false;
child.stdout.on('data', (b) => { const s = b.toString(); process.stdout.write('[srv] ' + s); if (s.includes('已启动')) ready = true; });
child.stderr.on('data', (b) => process.stderr.write('[srv!] ' + b.toString()));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  for (let i = 0; i < 50 && !ready; i++) await wait(100);
  if (!ready) { console.error('服务未就绪'); child.kill(); process.exit(1); }

  const base = `http://127.0.0.1:${PORT}`;
  const fetchJson = async (url, opts = {}) => {
    const res = await fetch(url, opts);
    const text = await res.text();
    let body; try { body = JSON.parse(text); } catch { body = text; }
    return { status: res.status, body };
  };

  const cases = [];
  cases.push(['GET  /api/departments', await fetchJson(`${base}/api/departments`)]);
  cases.push(['GET  /api/employees (列表)', await fetchJson(`${base}/api/employees?pageSize=3`)]);
  cases.push(['GET  /api/employees?q=技术 (中文搜索)', await fetchJson(`${base}/api/employees?q=${encodeURIComponent('技术')}`)]);
  cases.push(['GET  /api/employees?department=财务部', await fetchJson(`${base}/api/employees?department=${encodeURIComponent('财务部')}`)]);

  // 鉴权
  cases.push(['POST /api/employees (无 token → 应 401)', await fetchJson(`${base}/api/employees`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee_no: 'TEST1', name: '测试', department: '测试部' }),
  })]);

  const login = await fetchJson(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  cases.push(['POST /api/auth/login', login]);
  const token = login.body && login.body.token;

  if (token) {
    const auth = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
    const created = await fetchJson(`${base}/api/employees`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({
        employee_no: 'TEST99', name: '测试员工', department: '测试部',
        position: 'QA', mobile: '13900000000', email: 'test@example.com',
        extension: '9999', office_location: '远程', hire_date: '2025-01-01', notes: 'smoke test',
      }),
    });
    cases.push(['POST /api/employees (with token)', created]);
    if (created.body && created.body.id) {
      cases.push([`PUT  /api/employees/${created.body.id}`, await fetchJson(`${base}/api/employees/${created.body.id}`, {
        method: 'PUT', headers: auth,
        body: JSON.stringify({ employee_no: 'TEST99', name: '测试员工-改', department: '测试部', position: 'Senior QA' }),
      })]);
      cases.push([`DEL  /api/employees/${created.body.id}`, await fetchJson(`${base}/api/employees/${created.body.id}`, { method: 'DELETE', headers: auth })]);
    }
  }

  const csvRes = await fetch(`${base}/api/export`);
  const csvText = await csvRes.text();
  cases.push([`GET  /api/export (bytes=${csvText.length})`, { status: csvRes.status, body: csvText.slice(0, 80) + '...' }]);

  console.log('\n========== 冒烟测试结果 ==========');
  let pass = 0, fail = 0;
  for (const [name, r] of cases) {
    // 4xx 视为预期(用于鉴权拒绝的用例)
    const expected = name.includes('应 401');
    const ok = expected ? (r.status === 401) : (r.status >= 200 && r.status < 300);
    if (ok) pass++; else fail++;
    console.log(`${ok ? '✓' : '✗'} ${name}  →  HTTP ${r.status}`);
    if (!ok) console.log('  body:', JSON.stringify(r.body).slice(0, 200));
  }
  console.log(`\n通过 ${pass} / 失败 ${fail} / 总 ${cases.length}`);

  child.kill();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); child.kill(); process.exit(1); });
