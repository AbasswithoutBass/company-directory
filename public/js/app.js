// 员工查询页逻辑
const $ = (sel) => document.querySelector(sel);
const grid = $('#grid');
const empty = $('#empty');
const loading = $('#loading');
const totalEl = $('#total');
const deptCountEl = $('#deptCount');
const qInput = $('#q');
const deptSelect = $('#department');
const resetBtn = $('#reset');

let debounceTimer = null;

// 头像配色(根据姓名 hash)
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#6366f1'];
function colorFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}
function initials(name) {
  if (!name) return '?';
  // 中文取最后两个字,英文取首字母
  if (/[一-龥]/.test(name)) return name.slice(-2);
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function escape(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  try {
    const res = await fetch('/api/departments');
    const list = await res.json();
    deptCountEl.textContent = list.length;
    for (const d of list) {
      const opt = document.createElement('option');
      opt.value = d.department;
      opt.textContent = `${d.department} (${d.count})`;
      deptSelect.appendChild(opt);
    }
  } catch (e) {
    console.error(e);
  }
}

async function loadEmployees() {
  const q = qInput.value.trim();
  const department = deptSelect.value;
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (department) params.set('department', department);
  params.set('pageSize', '200');

  loading.style.display = '';
  empty.style.display = 'none';
  grid.innerHTML = '';

  try {
    const res = await fetch('/api/employees?' + params.toString());
    const data = await res.json();
    totalEl.textContent = data.total;
    renderList(data.items);
  } catch (e) {
    toast('加载失败: ' + e.message, 'error');
  } finally {
    loading.style.display = 'none';
  }
}

function renderList(items) {
  if (!items.length) {
    empty.style.display = '';
    return;
  }
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
  try {
    const res = await fetch('/api/employees/' + id);
    if (!res.ok) throw new Error('未找到');
    const e = await res.json();
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
  } catch (err) {
    toast(err.message, 'error');
  }
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
  await loadDepartments();
  await loadEmployees();
})();
