// 员工查询页逻辑(支持静态部署 demo 模式)
const $ = (sel) => document.querySelector(sel);
const grid = $('#grid');
const empty = $('#empty');
const loading = $('#loading');
const totalEl = $('#total');
const deptCountEl = $('#deptCount');
const qInput = $('#q');
const deptSelect = $('#department');
const resetBtn = $('#reset');
const staticBadge = $('#staticBadge');

let debounceTimer = null;
let isStatic = false;
let employees = [];

// 头像配色(根据姓名 hash)
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#6366f1'];
function colorFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}
function initials(name) {
  if (!name) return '?';
  if (/[一-龥]/.test(name)) return name.slice(-2);
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}
function escape(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function toast(msg, type = '') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2500);
}

// 加载部门列表
async function loadDepartments() {
  const list = await fetchEmployeesAll();
  const map = {};
  list.forEach((e) => { map[e.department] = (map[e.department] || 0) + 1; });
  deptCountEl.textContent = Object.keys(map).length;
  const sorted = Object.keys(map).sort();
  for (const d of sorted) {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = `${d} (${map[d]})`;
    deptSelect.appendChild(opt);
  }
}

async function fetchEmployeesAll() {
  if (isStatic) return employees;
  const res = await fetch(window.apiUrl('/api/employees?pageSize=200'));
  const data = await res.json();
  return data.items || [];
}

async function loadEmployees() {
  const q = qInput.value.trim().toLowerCase();
  const department = deptSelect.value;
  let list = await fetchEmployeesAll();
  if (q) {
    list = list.filter((e) =>
      (e.name || '').toLowerCase().includes(q)
      || (e.employee_no || '').toLowerCase().includes(q)
      || (e.mobile || '').toLowerCase().includes(q)
      || (e.email || '').toLowerCase().includes(q)
      || (e.position || '').toLowerCase().includes(q)
    );
  }
  if (department) list = list.filter((e) => e.department === department);

  totalEl.textContent = list.length;
  renderList(list);
  loading.style.display = 'none';
}

function renderList(items) {
  if (!items.length) { empty.style.display = ''; grid.innerHTML = ''; return; }
  empty.style.display = 'none';
  grid.innerHTML = items.map((e) => `
    <div class="employee-card" data-id="${e.id}">
      <div class="head">
        <div class="avatar" style="background:${colorFor(e.name)}">${escape(initials(e.name))}</div>
        <div style="min-width:0;flex:1">
          <div class="name">${escape(e.name)}</div>
          <div class="pos">${escape(e.position || '-')}</div>
        </div>
        <span class="dept-tag">${escape(e.department)}</span>
      </div>
      <div class="meta">
        <div class="meta-row">📞 ${escape(e.mobile || '-')}</div>
        <div class="meta-row">✉ ${escape(e.email || '-')}</div>
        ${e.extension ? `<div class="meta-row">🔢 分机 ${escape(e.extension)}</div>` : ''}
      </div>
    </div>
  `).join('');
  grid.querySelectorAll('.employee-card').forEach((card) => {
    card.addEventListener('click', () => showDetail(card.dataset.id));
  });
}

async function showDetail(id) {
  const list = await fetchEmployeesAll();
  const e = list.find((x) => String(x.id) === String(id));
  if (!e) return toast('未找到', 'error');
  $('#detailTitle').textContent = e.name;
  $('#detailBody').innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
      <div class="avatar" style="background:${colorFor(e.name)};width:56px;height:56px;font-size:20px">${escape(initials(e.name))}</div>
      <div>
        <div style="font-size:18px;font-weight:600">${escape(e.name)}</div>
        <div class="text-muted text-small">${escape(e.position || '')} · ${escape(e.department)}</div>
      </div>
    </div>
    <div class="detail-row"><div class="detail-label">工号</div><div class="detail-value">${escape(e.employee_no)}</div></div>
    <div class="detail-row"><div class="detail-label">部门</div><div class="detail-value">${escape(e.department)}</div></div>
    <div class="detail-row"><div class="detail-label">职位</div><div class="detail-value">${escape(e.position || '-')}</div></div>
    <div class="detail-row"><div class="detail-label">手机</div><div class="detail-value"><a href="tel:${escape(e.mobile)}">${escape(e.mobile || '-')}</a></div></div>
    <div class="detail-row"><div class="detail-label">邮箱</div><div class="detail-value"><a href="mailto:${escape(e.email)}">${escape(e.email || '-')}</a></div></div>
    <div class="detail-row"><div class="detail-label">分机</div><div class="detail-value">${escape(e.extension || '-')}</div></div>
    <div class="detail-row"><div class="detail-label">办公地点</div><div class="detail-value">${escape(e.office_location || '-')}</div></div>
    <div class="detail-row"><div class="detail-label">入职日期</div><div class="detail-value">${escape(e.hire_date || '-')}</div></div>
    <div class="detail-row"><div class="detail-label">备注</div><div class="detail-value">${escape(e.notes || '-')}</div></div>
  `;
  $('#detailModal').classList.add('show');
}

// 弹窗关闭
document.querySelectorAll('[data-close]').forEach((el) => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.modal-mask').forEach((m) => m.classList.remove('show'));
  });
});
$('#detailModal').addEventListener('click', (e) => {
  if (e.target.id === 'detailModal') e.target.classList.remove('show');
});

// 导出 CSV(前端实现)
$('#exportCsv')?.addEventListener('click', (ev) => {
  ev.preventDefault();
  const headers = ['工号', '姓名', '部门', '职位', '手机', '邮箱', '分机', '办公地点', '入职日期', '备注'];
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  fetchEmployeesAll().then((list) => {
    const csv = [headers.join(',')]
      .concat(list.map((r) => [r.employee_no, r.name, r.department, r.position, r.mobile, r.email, r.extension, r.office_location, r.hire_date, r.notes].map(esc).join(',')))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('已导出 CSV', 'success');
  });
});

// 事件
qInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadEmployees, 250);
});
deptSelect.addEventListener('change', loadEmployees);
resetBtn.addEventListener('click', () => {
  qInput.value = '';
  deptSelect.value = '';
  loadEmployees();
});

// 初始化
(async () => {
  isStatic = await window.checkBackend();
  if (isStatic) {
    employees = window.DEMO_DATA.slice();
    if (staticBadge) staticBadge.style.display = '';
    toast('演示模式 · 数据为内置示例,刷新即重置', 'success');
    setTimeout(() => $('#toast')?.classList.remove('show'), 4000);
  }
  await loadDepartments();
  await loadEmployees();
})();
