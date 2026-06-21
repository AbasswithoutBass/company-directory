// 初始化一些示例数据,便于演示
// 运行: npm run seed
const dbModule = require('./db');

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

(async () => {
  await dbModule.ready;
  const db = dbModule.db;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO employees
    (employee_no, name, department, position, mobile, email, extension, office_location, hire_date, notes)
    VALUES (@employee_no, @name, @department, @position, @mobile, @email, @extension, @office_location, @hire_date, @notes)
  `);

  let n = 0;
  for (const r of sample) {
    const before = db.prepare('SELECT id FROM employees WHERE employee_no = ?').get(r.employee_no);
    insert.run(r);
    const after = db.prepare('SELECT id FROM employees WHERE employee_no = ?').get(r.employee_no);
    if (!before && after) n++;
  }
  console.log(`[seed] 已写入 ${n} 条示例员工(若已存在则忽略)`);
})();
