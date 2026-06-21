// 静态部署时的示例数据(无后端时使用)
// 当页面在 GitHub Pages 等纯静态环境运行时,前端会引用这份数据
window.DEMO_DATA = [
  { id: 1,  employee_no: 'E001', name: '张伟',  department: '总裁办',     position: '总裁',     mobile: '13800000001', email: 'zhangwei@example.com',  extension: '8001', office_location: '北京-总部-18F',  hire_date: '2010-03-15', notes: '' },
  { id: 2,  employee_no: 'E002', name: '王芳',  department: '总裁办',     position: '副总裁',   mobile: '13800000002', email: 'wangfang@example.com',  extension: '8002', office_location: '北京-总部-18F',  hire_date: '2012-07-01', notes: '' },
  { id: 3,  employee_no: 'E003', name: '李娜',  department: '人力资源部', position: 'HR 经理',  mobile: '13800000003', email: 'lina@example.com',      extension: '8101', office_location: '北京-总部-15F',  hire_date: '2015-09-10', notes: '' },
  { id: 4,  employee_no: 'E004', name: '刘强',  department: '财务部',     position: 'CFO',      mobile: '13800000004', email: 'liuqiang@example.com',  extension: '8201', office_location: '北京-总部-15F',  hire_date: '2014-01-20', notes: '' },
  { id: 5,  employee_no: 'E005', name: '陈静',  department: '财务部',     position: '会计',     mobile: '13800000005', email: 'chenjing@example.com',  extension: '8202', office_location: '北京-总部-15F',  hire_date: '2018-05-12', notes: '' },
  { id: 6,  employee_no: 'E006', name: '杨洋',  department: '技术部',     position: 'CTO',      mobile: '13800000006', email: 'yangyang@example.com',  extension: '8301', office_location: '北京-总部-12F',  hire_date: '2013-04-08', notes: '技术总负责人' },
  { id: 7,  employee_no: 'E007', name: '赵磊',  department: '技术部',     position: '前端工程师', mobile: '13800000007', email: 'zhaolei@example.com', extension: '8302', office_location: '北京-总部-12F',  hire_date: '2020-06-15', notes: '' },
  { id: 8,  employee_no: 'E008', name: '孙婷',  department: '技术部',     position: '后端工程师', mobile: '13800000008', email: 'sunting@example.com', extension: '8303', office_location: '北京-总部-12F',  hire_date: '2019-11-20', notes: '' },
  { id: 9,  employee_no: 'E009', name: '周杰',  department: '产品部',     position: '产品经理', mobile: '13800000009', email: 'zhoujie@example.com',   extension: '8401', office_location: '北京-总部-12F',  hire_date: '2021-02-18', notes: '' },
  { id: 10, employee_no: 'E010', name: '吴敏',  department: '市场部',     position: '市场总监', mobile: '13800000010', email: 'wumin@example.com',     extension: '8501', office_location: '上海-分部-22F',  hire_date: '2016-08-25', notes: '' },
  { id: 11, employee_no: 'E011', name: '郑浩',  department: '市场部',     position: '市场专员', mobile: '13800000011', email: 'zhenghao@example.com',  extension: '8502', office_location: '上海-分部-22F',  hire_date: '2022-03-30', notes: '' },
  { id: 12, employee_no: 'E012', name: '冯婷婷', department: '行政部',     position: '行政助理', mobile: '13800000012', email: 'fengtt@example.com',    extension: '8601', office_location: '北京-总部-15F',  hire_date: '2023-01-09', notes: '' },
];

// 工具:探测是否在 GitHub Pages / 纯静态环境
// 思路:试图调一次 /api/employees,2xx 算有后端,否则切换到 demo 数据
window.STATIC_MODE = false;
window.checkBackend = async function () {
  try {
    const r = await fetch('/api/employees?pageSize=1', { method: 'GET' });
    if (r.ok) return false; // 有真后端
  } catch (e) { /* 网络错 = 静态 */ }
  return true;
};
