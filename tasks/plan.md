# WorkBuddy 云端架构代码基础建设完成计划

## 目标

在不执行 Supabase SQL、不推送、不部署的前提下，把现有架构方案中可以独立交付的代码基础全部完成，并为数据库启用阶段留下明确、可验证的接口。

## 任务顺序

### Phase A：迁移与读写切换收口

- [x] A1：统一迁移状态、游标、离线队列和失败回退状态模型。
- [x] A2：补齐 workspace_state 瘦身函数与只保留 UI 配置的兼容边界。
- [x] A3：为 candidates、resume_versions、业务实体提供统一的读路径启用/回退契约。

### Phase B：安全与同步基础

- [x] B1：补齐 AI 代理调用接口边界和服务端密钥承载骨架；现有直连兼容路径保留到 Edge Function 部署阶段切换。
- [x] B2：统一离线队列、重试、冲突和同步状态展示契约。
- [x] B3：补齐迁移、对账、切读的静态验收测试。

### Phase C：Phase 4 搜索与匹配代码骨架

- [x] C1：新增全文搜索 Repository 和 RPC 契约，支持分页、关键词和结果高亮字段。
- [x] C2：新增结构化候选人画像和岗位匹配 Repository 契约。
- [x] C3：新增向量匹配/LLM 精排接口边界，SQL/RPC 未启用时明确回退原因。

## 验收标准

- 所有新模块都有独立测试。
- `npm test`、`npm run build`、官方 npm 源 `npm audit --audit-level=high` 全部通过。
- 未执行 SQL 时页面不会误报“已启用云端读路径”。
- 失败不会覆盖本地快照、原始文件、历史版本或业务记录。
- 所有未完成项都明确标记为“待 SQL/待生产启用”，不静默降级。

## 暂不执行

- Supabase SQL 执行。
- GitHub 推送、Pull Request 和 Pages 部署。
- 线上 Realtime 开启。
