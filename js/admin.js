// 管理后台逻辑(支持静态部署 demo 模式)
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const TOKEN_KEY = 'directory_admin_token';

const loginView = $('#loginView');
const adminView = $('#adminView');
const loginForm = $('#loginForm');
const loginError = $('#loginError');
const loginUser = $('#loginUser');
const logoutBtn = $('#logoutBtn');
const staticBadge = $('#staticBadge');

const qInput = $('#q');
const deptSelect = $('#department');
const tbody = $('#tbody');
const totalEl = $('#total');
const emptyEl = $('#empty');
const checkAllEl = $('#checkAll');
const batchDelBtn = $('#batchDelBtn');
const selectedCountEl = $('#selectedCount');

let selectedIds = new Set();

const formModal = $('#formModal');
const formTitle = $('#formTitle');
const empForm = $('#empForm');
const saveBtn = $('#saveBtn');
const deptList = $('#deptList');

const confirmModal = $('#confirmModal');
const confirmName = $('#confirmName');
const confirmOk = $('#confirmOk');

let pendingDeleteId = null;
let isStatic = false;
let employees = [];

function token() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

function toast(msg, type = '') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2500);
}
function escape(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function showLogin() { loginView.style.display = ''; adminView.style.display = 'none'; }
function showAdmin() { loginView.style.display = 'none'; adminView.style.display = ''; }

// ===== 数据访问 =====
async function fetchAll() {
  if (isStatic) return employees;
  const data = await api('/api/employees?pageSize=500');
  return data.items || [];
}
async function api(path, options = {}) {
  const headers = options.headers || {};
  const t = token();
  if (t) headers.Authorization = 'Bearer ' + t;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const url = window.apiUrl(path);
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) { clearToken(); showLogin(); throw new Error('登录已过期'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

// ===== 登录 =====
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  if (isStatic) {
    // 静态模式:任何账号密码都直接进
    setToken('demo-static');
    loginUser.textContent = 'demo (静态模式)';
    showAdmin();
    await loadDepartments();
    await loadEmployees();
    toast('演示模式 · 写操作不会持久化', 'success');
    return;
  }
  const fd = new FormData(loginForm);
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: { username: fd.get('username'), password: fd.get('password') },
    });
    setToken(data.token);
    loginUser.textContent = data.username;
    showAdmin();
    await loadDepartments();
    await loadEmployees();
  } catch (err) {
    loginError.textContent = err.message;
  }
});

logoutBtn.addEventListener('click', () => {
  clearToken();
  showLogin();
  loginForm.reset();
});

// ===== 列表 =====
async function loadDepartments() {
  const list = await fetchAll();
  const map = {};
  list.forEach((e) => { map[e.department] = (map[e.department] || 0) + 1; });
  const sorted = Object.keys(map).sort();
  deptSelect.innerHTML = '<option value="">全部部门</option>';
  deptList.innerHTML = '';
  for (const d of sorted) {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = `${d} (${map[d]})`;
    deptSelect.appendChild(opt);
    const opt2 = document.createElement('option');
    opt2.value = d;
    deptList.appendChild(opt2);
  }
}

let debounceTimer = null;
async function loadEmployees() {
  const q = qInput.value.trim().toLowerCase();
  const department = deptSelect.value;
  let list = await fetchAll();
  if (q) {
    list = list.filter((e) =>
      (e.name || '').toLowerCase().includes(q)
      || (e.employee_no || '').toLowerCase().includes(q)
      || (e.mobile || '').toLowerCase().includes(q)
      || (e.email || '').toLowerCase().includes(q)
    );
  }
  if (department) list = list.filter((e) => e.department === department);
  // 清理已不存在的选中 id
  const present = new Set(list.map((e) => e.id));
  for (const id of selectedIds) if (!present.has(id)) selectedIds.delete(id);
  totalEl.textContent = list.length;
  renderTable(list);
}

function renderTable(items) {
  if (!items.length) {
    tbody.innerHTML = '';
    emptyEl.style.display = '';
    updateSelectedUI();
    return;
  }
  emptyEl.style.display = 'none';
  tbody.innerHTML = items.map((e) => `
    <tr data-id="${e.id}" data-no="${escape(e.employee_no)}" ${selectedIds.has(e.id) ? 'class="selected"' : ''}>
      <td><input type="checkbox" class="row-check" data-id="${e.id}" ${selectedIds.has(e.id) ? 'checked' : ''} /></td>
      <td>${escape(e.employee_no)}</td>
      <td><strong>${escape(e.name)}</strong></td>
      <td>${escape(e.department)}</td>
      <td>${escape(e.position || '-')}</td>
      <td>${escape(e.mobile || '-')}</td>
      <td>${escape(e.email || '-')}</td>
      <td>${escape(e.extension || '-')}</td>
      <td class="actions">
        <button class="ghost" data-act="edit">编辑</button>
        <button class="danger" data-act="del">删除</button>
      </td>
    </tr>
  `).join('');
  // 删除后保留选中状态需要重置
  syncCheckAllState();
  updateSelectedUI();
}

tbody.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const tr = btn.closest('tr');
  const id = tr.dataset.id;
  if (btn.dataset.act === 'edit') openEdit(id);
  else if (btn.dataset.act === 'del') {
    pendingDeleteId = id;
    confirmName.textContent = tr.children[2].textContent.trim();
    confirmModal.classList.add('show');
  }
});

// 单选
tbody.addEventListener('change', (e) => {
  if (!e.target.classList.contains('row-check')) return;
  const id = Number(e.target.dataset.id);
  const tr = e.target.closest('tr');
  if (e.target.checked) { selectedIds.add(id); tr.classList.add('selected'); }
  else { selectedIds.delete(id); tr.classList.remove('selected'); }
  syncCheckAllState();
  updateSelectedUI();
});

// 全选
checkAllEl.addEventListener('change', () => {
  const checks = tbody.querySelectorAll('.row-check');
  if (checkAllEl.checked) checks.forEach((c) => {
    const id = Number(c.dataset.id);
    selectedIds.add(id);
    c.checked = true;
    c.closest('tr').classList.add('selected');
  });
  else checks.forEach((c) => {
    const id = Number(c.dataset.id);
    selectedIds.delete(id);
    c.checked = false;
    c.closest('tr').classList.remove('selected');
  });
  updateSelectedUI();
});

function syncCheckAllState() {
  const checks = tbody.querySelectorAll('.row-check');
  if (!checks.length) { checkAllEl.checked = false; checkAllEl.indeterminate = false; return; }
  const checkedCount = Array.from(checks).filter((c) => c.checked).length;
  checkAllEl.checked = checkedCount === checks.length;
  checkAllEl.indeterminate = checkedCount > 0 && checkedCount < checks.length;
}

function updateSelectedUI() {
  const n = selectedIds.size;
  selectedCountEl.textContent = `(${n})`;
  batchDelBtn.disabled = n === 0;
  batchDelBtn.style.opacity = n === 0 ? '0.5' : '1';
  batchDelBtn.style.cursor = n === 0 ? 'not-allowed' : 'pointer';
}

batchDelBtn.addEventListener('click', async () => {
  if (selectedIds.size === 0) return;
  if (!confirm(`确定删除选中的 ${selectedIds.size} 位员工?此操作不可恢复。`)) return;
  const ids = Array.from(selectedIds);
  const nos = Array.from(tbody.querySelectorAll('.row-check:checked'))
    .map((c) => c.closest('tr').dataset.no);
  try {
    const r = await api('/api/employees/batch-delete', { method: 'POST', body: { ids, employee_nos: nos } });
    toast(`已删除 ${r.deleted} 条`, 'success');
    selectedIds.clear();
    await loadDepartments();
    await loadEmployees();
  } catch (e) { toast(e.message, 'error'); }
});

confirmOk.addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  if (isStatic) {
    employees = employees.filter((e) => String(e.id) !== String(pendingDeleteId));
    toast('已删除(演示模式,刷新后恢复)', 'success');
    await loadDepartments();
    await loadEmployees();
  } else {
    try {
      await api('/api/employees/' + pendingDeleteId, { method: 'DELETE' });
      toast('已删除', 'success');
      await loadDepartments();
      await loadEmployees();
    } catch (e) { toast(e.message, 'error'); }
  }
  pendingDeleteId = null;
  confirmModal.classList.remove('show');
});

// ===== 新增 / 编辑 =====
$('#newBtn').addEventListener('click', () => {
  empForm.reset();
  empForm.id.value = '';
  formTitle.textContent = '新增员工';
  formModal.classList.add('show');
});

async function openEdit(id) {
  const list = await fetchAll();
  const e = list.find((x) => String(x.id) === String(id));
  if (!e) return toast('未找到', 'error');
  empForm.reset();
  empForm.id.value = e.id;
  empForm.employee_no.value = e.employee_no || '';
  empForm.name.value = e.name || '';
  empForm.department.value = e.department || '';
  empForm.position.value = e.position || '';
  empForm.mobile.value = e.mobile || '';
  empForm.email.value = e.email || '';
  empForm.extension.value = e.extension || '';
  empForm.office_location.value = e.office_location || '';
  empForm.hire_date.value = e.hire_date || '';
  empForm.notes.value = e.notes || '';
  formTitle.textContent = '编辑员工';
  formModal.classList.add('show');
}

saveBtn.addEventListener('click', async () => {
  if (!empForm.reportValidity()) return;
  const id = empForm.id.value;
  const body = {
    employee_no: empForm.employee_no.value.trim(),
    name: empForm.name.value.trim(),
    department: empForm.department.value.trim(),
    position: empForm.position.value.trim(),
    mobile: empForm.mobile.value.trim(),
    email: empForm.email.value.trim(),
    extension: empForm.extension.value.trim(),
    office_location: empForm.office_location.value.trim(),
    hire_date: empForm.hire_date.value,
    notes: empForm.notes.value.trim(),
  };
  if (isStatic) {
    if (id) {
      const i = employees.findIndex((x) => String(x.id) === String(id));
      if (i >= 0) employees[i] = { ...employees[i], ...body };
      toast('已更新(演示模式,刷新后恢复)', 'success');
    } else {
      const newId = Math.max(0, ...employees.map((x) => x.id)) + 1;
      employees.push({ id: newId, ...body });
      toast('已添加(演示模式,刷新后恢复)', 'success');
    }
    formModal.classList.remove('show');
    await loadDepartments();
    await loadEmployees();
    return;
  }
  try {
    if (id) await api('/api/employees/' + id, { method: 'PUT', body });
    else await api('/api/employees', { method: 'POST', body });
    toast(id ? '已更新' : '已添加', 'success');
    formModal.classList.remove('show');
    await loadDepartments();
    await loadEmployees();
  } catch (err) {
    toast(err.message, 'error');
  }
});

// 弹窗关闭
$$('[data-close]').forEach((el) => el.addEventListener('click', () => {
  formModal.classList.remove('show');
  confirmModal.classList.remove('show');
}));
[formModal, confirmModal].forEach((m) => m.addEventListener('click', (e) => {
  if (e.target === m) m.classList.remove('show');
}));

qInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadEmployees, 250);
});
deptSelect.addEventListener('change', loadEmployees);

// 启动
(async () => {
  isStatic = await window.checkBackend();
  if (isStatic) {
    employees = window.DEMO_DATA.slice();
    if (staticBadge) staticBadge.style.display = '';
  }
  if (isStatic || token()) {
    // 静态模式:直接进管理页
    if (isStatic) {
      setToken('demo-static');
      loginUser.textContent = 'demo (静态模式)';
    } else {
      try {
        const me = await api('/api/auth/me');
        loginUser.textContent = me.username;
      } catch { showLogin(); return; }
    }
    showAdmin();
    await loadDepartments();
    await loadEmployees();
    if (isStatic) toast('演示模式 · 写操作仅在内存中,刷新即重置', 'success');
  } else {
    showLogin();
  }
})();
