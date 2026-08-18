# 人才详情原始简历优先设计

## 目标

候选人从人才库或推进中心打开详情时，优先进入原始简历阅读视图；详情 Drawer 保持非模态，方便继续查看人才库列表。

## 结构

- 默认 Tab 为“原始简历”。
- Drawer 与完整页面共用同一候选人详情树和简历版本状态。
- 高频信息收敛到顶部身份区：姓名、公司/岗位、Base、年龄、电话、邮箱、归属顾问、求职状态。
- 详情 Tab 使用原始简历、结构化信息、推荐记录、面试进度、跟进记录、AI分析；岗位匹配继续通过现有操作入口保留。

## 数据复用

- 原始文件和文本继续使用现有 resume-original loaders、resume-version-repo、CandidateResumeVersions 和 ResumeFileSync。
- 推荐记录来自当前候选人的全部 visible Applications。
- 面试进度复用 Application 阶段和 pipeline stages，支持同一候选人多个并行推进。
- 跟进记录复用候选人现有 followups 与 pipelineEvents；不创建新数据模型。

## 验收

覆盖有原件、仅文本、多版本、无简历、多个 Application、无 Application、刷新默认原始简历，以及人才库/推进中心入口一致性。
