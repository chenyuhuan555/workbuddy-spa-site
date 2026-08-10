-- 量子人才雷达 MVP 种子数据。
-- 可重复执行：使用 UPSERT，不会生成重复记录。

insert into public.quantum_radar_companies
  (id, workspace_id, name, domain, hiring_status, job_count, focus, source)
values
  ('qc-origin', 'main', '本源量子', '超导量子计算', '招聘活跃', 6, '量子软件、量子云平台', '演示数据'),
  ('qc-ibm', 'main', 'IBM Quantum', '量子软件与纠错', '招聘活跃', 4, '量子算法、纠错码', '演示数据'),
  ('qc-quantinuum', 'main', 'Quantinuum', '离子阱量子计算', '持续关注', 3, '量子应用、编译器', '演示数据'),
  ('qc-cas', 'main', '中科院量子信息重点实验室', '量子通信与精密测量', '研究合作', 2, '量子通信、量子器件', '演示数据')
on conflict (id) do update set
  name = excluded.name,
  domain = excluded.domain,
  hiring_status = excluded.hiring_status,
  job_count = excluded.job_count,
  focus = excluded.focus,
  source = excluded.source,
  updated_at = now();

insert into public.external_jobs
  (id, workspace_id, title, company, location, quantum_domain, score, status, posted_days, source)
values
  ('qj-001', 'main', 'Quantum Compiler Engineer', '本源量子', '合肥 / 杭州', '量子编译器', 92, '重点机会', 2, '演示数据'),
  ('qj-002', 'main', 'Quantum Error Correction Scientist', 'IBM Quantum', '北京 / Remote', '量子纠错', 89, '重点机会', 4, '演示数据'),
  ('qj-003', 'main', '量子算法研究员', 'Quantinuum', '上海', '量子算法', 86, '待评估', 6, '演示数据'),
  ('qj-004', 'main', '量子通信系统工程师', '中科院量子信息重点实验室', '合肥', '量子通信', 81, '持续跟进', 8, '演示数据'),
  ('qj-005', 'main', 'Quantum Cloud Product Manager', '本源量子', '合肥', '量子云平台', 78, '待评估', 10, '演示数据'),
  ('qj-006', 'main', '量子器件工艺负责人', '中科院量子信息重点实验室', '北京', '量子器件', 74, '持续跟进', 13, '演示数据')
on conflict (id) do update set
  title = excluded.title,
  company = excluded.company,
  location = excluded.location,
  quantum_domain = excluded.quantum_domain,
  score = excluded.score,
  status = excluded.status,
  posted_days = excluded.posted_days,
  source = excluded.source,
  updated_at = now();

insert into public.talent_leads
  (id, workspace_id, name, institution, research_direction, matched_jobs, match_score, stage, source)
values
  ('qt-001', 'main', '周谨言', '清华大学量子信息中心', '量子纠错 / 表面码', '["Quantum Error Correction Scientist"]'::jsonb, 94, '优先联系', '演示数据'),
  ('qt-002', 'main', '林若川', '中国科学技术大学', '量子编译器 / 量子算法', '["Quantum Compiler Engineer", "量子算法研究员"]'::jsonb, 91, '待沟通', '演示数据'),
  ('qt-003', 'main', '陈思远', '上海交通大学', '量子通信 / 网络协议', '["量子通信系统工程师"]'::jsonb, 88, '待沟通', '演示数据'),
  ('qt-004', 'main', '许知行', '浙江大学量子实验室', '量子器件 / 超导工艺', '["量子器件工艺负责人"]'::jsonb, 84, '建立联系', '演示数据'),
  ('qt-005', 'main', '王知微', '香港科技大学', '量子云平台 / 产品策略', '["Quantum Cloud Product Manager"]'::jsonb, 79, '线索观察', '演示数据')
on conflict (id) do update set
  name = excluded.name,
  institution = excluded.institution,
  research_direction = excluded.research_direction,
  matched_jobs = excluded.matched_jobs,
  match_score = excluded.match_score,
  stage = excluded.stage,
  source = excluded.source,
  updated_at = now();

insert into public.quantum_crawl_tasks
  (id, workspace_id, name, status, last_run_at, source, result_count)
values
  ('qtask-001', 'main', '量子计算公司官网岗位同步', '已完成', now() - interval '30 minutes', '公司官网', 8),
  ('qtask-002', 'main', '量子研究机构人才线索扫描', '运行中', now() - interval '5 minutes', '研究机构', 12),
  ('qtask-003', 'main', '行业社区新岗位采集', '待运行', now() - interval '1 day', '行业社区', 5),
  ('qtask-004', 'main', '外部线索去重与评分', '已完成', now() - interval '1 day', '内部规则', 17)
on conflict (id) do update set
  name = excluded.name,
  status = excluded.status,
  last_run_at = excluded.last_run_at,
  source = excluded.source,
  result_count = excluded.result_count,
  updated_at = now();
