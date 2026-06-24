// 端到端测试 Render 部署
const BASE = 'https://company-directory-w22q.onrender.com';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, opts);
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

(async () => {
  console.log('⏳ 等服务唤醒(冷启动可能 30s)...\n');

  const cases = [];

  // 1. 首页 HTML
  cases.push(['GET /', await api('/')]);

  // 2. 部门列表
  cases.push(['GET /api/departments', await api('/api/departments')]);

  // 3. 员工列表
  cases.push(['GET /api/employees?pageSize=3', await api('/api/employees?pageSize=3')]);

  // 4. 中文搜索
  cases.push(['GET /api/employees?q=技术', await api('/api/employees?q=' + encodeURIComponent('技术'))]);

  // 5. 按部门筛选
  cases.push(['GET /api/employees?department=财务部', await api('/api/employees?department=' + encodeURIComponent('财务部'))]);

  // 6. 未登录写操作
  cases.push(['POST /api/employees (无 token)', await api('/api/employees', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee_no: 'T1', name: '测试', department: '测试部' }),
  })]);

  // 7. 登录
  const login = await api('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  cases.push(['POST /api/auth/login', login]);

  const token = login.body && login.body.token;
  if (token) {
    const auth = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

    // 8. 创建
    const created = await api('/api/employees', {
      method: 'POST', headers: auth,
      body: JSON.stringify({
        employee_no: 'RT001', name: '云端测试员', department: '运维部',
        position: 'SRE', mobile: '13900099999', email: 'cloud@example.com',
        extension: '7777', office_location: '云上-Region-US', hire_date: '2025-12-01', notes: '在 Render 上真后端测试',
      }),
    });
    cases.push(['POST /api/employees (with token)', created]);

    if (created.body && created.body.id) {
      // 9. 更新
      cases.push([`PUT /api/employees/${created.body.id}`, await api(`/api/employees/${created.body.id}`, {
        method: 'PUT', headers: auth,
        body: JSON.stringify({
          employee_no: 'RT001', name: '云端测试员-改', department: '运维部',
          position: 'Senior SRE', mobile: '13900099999', email: 'cloud@example.com',
        }),
      })]);

      // 10. 读回
      cases.push([`GET /api/employees/${created.body.id}`, await api(`/api/employees/${created.body.id}`)]);

      // 11. 删除
      cases.push([`DELETE /api/employees/${created.body.id}`, await api(`/api/employees/${created.body.id}`, {
        method: 'DELETE', headers: auth,
      })]);
    }
  }

  // 12. CSV 导出
  const csvRes = await fetch(BASE + '/api/export');
  const csvText = await csvRes.text();
  cases.push([`GET /api/export (bytes=${csvText.length}, ct=${csvRes.headers.get('content-type')})`, { status: csvRes.status, body: csvText.slice(0, 80) + '...' }]);

  console.log('========== 端到端测试结果 ==========');
  let pass = 0, fail = 0;
  for (const [name, r] of cases) {
    const expected401 = name.includes('无 token');
    const ok = expected401 ? (r.status === 401) : (r.status >= 200 && r.status < 300);
    if (ok) pass++; else fail++;
    console.log(`${ok ? '✓' : '✗'} ${name}  →  HTTP ${r.status}`);
    if (!ok) console.log('  body:', JSON.stringify(r.body).slice(0, 200));
  }
  console.log(`\n通过 ${pass} / 失败 ${fail} / 总 ${cases.length}`);
})();
