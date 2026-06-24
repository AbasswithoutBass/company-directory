// 控制台逻辑
const $ = (s) => document.querySelector(s);
const TOKEN_KEY = 'directory_admin_token';

function token() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

function toast(msg, type = '') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 3000);
}

async function api(path, options = {}) {
  const headers = options.headers || {};
  const t = token();
  if (t) headers.Authorization = 'Bearer ' + t;
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(window.apiUrl(path), { ...options, headers });
  if (res.status === 401) { clearToken(); showLogin(); throw new Error('登录已过期'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}

function showLogin() { $('#loginGate').style.display = ''; $('#consoleBody').style.display = 'none'; }
function showConsole() { $('#loginGate').style.display = 'none'; $('#consoleBody').style.display = ''; }

// 登录
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#loginError').textContent = '';
  const fd = new FormData($('#loginForm'));
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: { username: fd.get('username'), password: fd.get('password') },
    });
    setToken(data.token);
    showConsole();
    await loadStats();
  } catch (err) {
    $('#loginError').textContent = err.message;
  }
});

$('#logoutBtn').addEventListener('click', () => { clearToken(); showLogin(); $('#loginForm').reset(); });

// 加载状态
async function loadStats() {
  try {
    const s = await api('/api/admin/stats');
    $('#sEmployees').textContent = s.employees;
    $('#sDepts').textContent = s.departments;
    $('#sAdmins').textContent = s.admins;
    $('#sSize').textContent = s.dbSizeKB + ' KB';
    $('#sSizeSub').textContent = `${s.dbSizeBytes} bytes`;
    const h = Math.floor(s.uptimeSec / 3600);
    const m = Math.floor((s.uptimeSec % 3600) / 60);
    $('#sUptime').textContent = h + 'h ' + m + 'm';
    $('#sUptimeSub').textContent = `${s.uptimeSec}s total`;
    $('#sLast').textContent = s.lastEmployeeAt || '(空)';
    $('#dataDir').textContent = s.dataDir;
    $('#nodeVer').textContent = s.nodeVersion;
  } catch (e) {
    toast('加载状态失败: ' + e.message, 'error');
  }
}

// 改密码
$('#changePwdBtn').addEventListener('click', async () => {
  const np = $('#newPwd').value;
  if (np.length < 6) return toast('密码至少 6 位', 'error');
  if (!confirm('确定改密码?')) return;
  try {
    await api('/api/admin/change-password', { method: 'POST', body: { newPassword: np } });
    toast('密码已更新', 'success');
    $('#newPwd').value = '';
  } catch (e) { toast(e.message, 'error'); }
});

// reseed
$('#reseedBtn').addEventListener('click', async () => {
  if (!confirm('追加 12 条示例员工,继续?')) return;
  try {
    const r = await api('/api/admin/reseed', { method: 'POST' });
    toast(`已追加 ${r.seeded} 条`, 'success');
    await loadStats();
  } catch (e) { toast(e.message, 'error'); }
});

// backup
$('#backupBtn').addEventListener('click', async () => {
  try {
    const r = await api('/api/admin/backup');
    const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('已下载备份', 'success');
  } catch (e) { toast(e.message, 'error'); }
});

// restore
$('#restoreBtn').addEventListener('click', async () => {
  const f = $('#restoreFile').files[0];
  if (!f) return toast('请先选一个 JSON 备份文件', 'error');
  if (!confirm(`将替换式导入 ${f.name},当前所有数据会丢失,继续?`)) return;
  try {
    const text = await f.text();
    const json = JSON.parse(text);
    const list = json.employees || json;
    if (!Array.isArray(list)) throw new Error('文件格式不对,缺少 employees 数组');
    const r = await api('/api/admin/restore', { method: 'POST', body: { employees: list } });
    toast(`已导入 ${r.restored} 条`, 'success');
    await loadStats();
  } catch (e) { toast(e.message, 'error'); }
});

// reset
$('#resetBtn').addEventListener('click', async () => {
  const confirmWord = prompt('⚠️ 不可恢复操作!\n\n将清空所有员工数据。\n\n输入 DELETE 大写确认:');
  if (confirmWord !== 'DELETE') return toast('已取消', '');
  try {
    const r = await api('/api/admin/reset', { method: 'POST', body: { confirm: 'DELETE' } });
    toast(`已删除 ${r.deleted} 条`, 'success');
    await loadStats();
  } catch (e) { toast(e.message, 'error'); }
});

// 启动
(async () => {
  if (token()) {
    try {
      await api('/api/auth/me');
      showConsole();
      await loadStats();
      return;
    } catch { /* fall through */ }
  }
  showLogin();
})();
