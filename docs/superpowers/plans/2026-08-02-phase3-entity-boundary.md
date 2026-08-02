# Phase 3 Entity Boundary Plan

## Goal

为 companies、positions、applications 建立独立云端表和行级仓储边界，先完成兼容双写基础；本阶段不切换页面读取来源，不执行 Supabase SQL。

## Scope

1. 使用当前 V2 的 text ID，不直接采用旧方案中的 uuid，避免破坏现有业务记录和引用关系。
2. 三张表统一采用 `workspace_id`、`extra`、软删除、更新时间触发器和 profiles 角色 RLS。
3. 仓储层提供字段映射、批量 upsert、稳定分页、按更新时间增量读取和权限错误映射。
4. 页面同步与读取切换放到后续垂直切片，确保基础契约先经过测试。

## Tasks

- [x] 为三类实体编写失败测试：字段映射、大字段隔离、分页、游标、RLS 权限。
- [x] 实现 `workbench-entity-repo.js`，提供 company/position/application 三类表的统一仓储。
- [x] 编写 `workbench-entities.sql`，包含建表、索引、触发器、RLS 和兼容升级语句。
- [x] 加入全量测试脚本和架构文档，确认当前读取仍来自 workspace_state/workbenchV2。
- [x] 通过全量测试、构建、审计和 diff 检查后提交。

## Deferred

- 页面双写触发和迁移 UI。
- applications 看板的云端读取切换。
- workspace_state 退化为 UI 配置。
- Realtime 和 SQL 实际执行。
