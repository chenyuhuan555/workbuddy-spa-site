(function (global) {
  'use strict';

  global.WorkBuddyQuantumDemoData = Object.freeze({
    quantumCompanies: [
      { id: 'qc-origin', name: '本源量子', domain: '超导量子计算', hiringStatus: '招聘活跃', jobCount: 6, focus: '量子软件、量子云平台' },
      { id: 'qc-ibm', name: 'IBM Quantum', domain: '量子软件与纠错', hiringStatus: '招聘活跃', jobCount: 4, focus: '量子算法、纠错码' },
      { id: 'qc-quantinuum', name: 'Quantinuum', domain: '离子阱量子计算', hiringStatus: '持续关注', jobCount: 3, focus: '量子应用、编译器' },
      { id: 'qc-cas', name: '中科院量子信息重点实验室', domain: '量子通信与精密测量', hiringStatus: '研究合作', jobCount: 2, focus: '量子通信、量子器件' },
    ],
    externalJobs: [
      { id: 'qj-001', title: 'Quantum Compiler Engineer', company: '本源量子', location: '合肥 / 杭州', quantumDomain: '量子编译器', score: 92, status: '重点机会', postedDays: 2, source: '公司官网' },
      { id: 'qj-002', title: 'Quantum Error Correction Scientist', company: 'IBM Quantum', location: '北京 / Remote', quantumDomain: '量子纠错', score: 89, status: '重点机会', postedDays: 4, source: 'LinkedIn' },
      { id: 'qj-003', title: '量子算法研究员', company: 'Quantinuum', location: '上海', quantumDomain: '量子算法', score: 86, status: '待评估', postedDays: 6, source: '行业社区' },
      { id: 'qj-004', title: '量子通信系统工程师', company: '中科院量子信息重点实验室', location: '合肥', quantumDomain: '量子通信', score: 81, status: '持续跟进', postedDays: 8, source: '研究机构' },
      { id: 'qj-005', title: 'Quantum Cloud Product Manager', company: '本源量子', location: '合肥', quantumDomain: '量子云平台', score: 78, status: '待评估', postedDays: 10, source: '公司官网' },
      { id: 'qj-006', title: '量子器件工艺负责人', company: '中科院量子信息重点实验室', location: '北京', quantumDomain: '量子器件', score: 74, status: '持续跟进', postedDays: 13, source: '行业社区' },
    ],
    talentLeads: [
      { id: 'qt-001', name: '周谨言', institution: '清华大学量子信息中心', researchDirection: '量子纠错 / 表面码', matchedJobs: ['Quantum Error Correction Scientist'], matchScore: 94, stage: '优先联系' },
      { id: 'qt-002', name: '林若川', institution: '中国科学技术大学', researchDirection: '量子编译器 / 量子算法', matchedJobs: ['Quantum Compiler Engineer', '量子算法研究员'], matchScore: 91, stage: '待沟通' },
      { id: 'qt-003', name: '陈思远', institution: '上海交通大学', researchDirection: '量子通信 / 网络协议', matchedJobs: ['量子通信系统工程师'], matchScore: 88, stage: '待沟通' },
      { id: 'qt-004', name: '许知行', institution: '浙江大学量子实验室', researchDirection: '量子器件 / 超导工艺', matchedJobs: ['量子器件工艺负责人'], matchScore: 84, stage: '建立联系' },
      { id: 'qt-005', name: '王知微', institution: '香港科技大学', researchDirection: '量子云平台 / 产品策略', matchedJobs: ['Quantum Cloud Product Manager'], matchScore: 79, stage: '线索观察' },
    ],
    crawlTasks: [
      { id: 'qtask-001', name: '量子计算公司官网岗位同步', status: '已完成', lastRun: '今天 09:30', source: '公司官网', resultCount: 8 },
      { id: 'qtask-002', name: '量子研究机构人才线索扫描', status: '运行中', lastRun: '今天 10:05', source: '研究机构', resultCount: 12 },
      { id: 'qtask-003', name: '行业社区新岗位采集', status: '待运行', lastRun: '昨天 18:20', source: '行业社区', resultCount: 5 },
      { id: 'qtask-004', name: '外部线索去重与评分', status: '已完成', lastRun: '昨天 17:45', source: '内部规则', resultCount: 17 },
    ],
  });
})(window);
