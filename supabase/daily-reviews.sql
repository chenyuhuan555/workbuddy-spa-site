-- 每日复盘（Daily Review）— P1-1「每日复盘团队化」
-- 目标：把首页「今日复盘」从临时前端 UI 升级为可保存、可回看、管理员可查看团队的复盘系统。
--
-- 设计约定：
-- - 一个顾问一天只有一条 DailyReview（唯一约束 workspace_id + user_id + review_date）
-- - metrics 是「保存时的当日业务快照」，由前端 daily-review-metrics.js 纯函数计算；
--   系统自动统计客观业务数据，不要求用户手工编辑数字
-- - issue / tomorrow_focus / summary 是主观文本，仅顾问本人填写
-- - 管理员可读全团队（SELECT），但不代写（UPDATE 仍限本人 user_id = auth.uid()）
-- - 复用 public.is_workbench_admin()（定义见 workbench-permissions.sql）
-- - review_date 使用日历日期（YYYY-MM-DD），由前端按 Asia/Shanghai 时区生成，避免 UTC 跨天
--
-- 依赖：public.touch_updated_at()（本文件 create or replace 兜底）与
--       public.is_workbench_admin()（在 workbench-permissions.sql 中定义）。
-- 建议执行顺序：在 candidates.sql / workbench-permissions.sql 之后执行本文件。
-- 本文件全部幂等，可重复执行。

create table if not exists public.daily_reviews (
  id              text primary key,
  workspace_id    text not null default 'main',
  user_id         uuid not null,
  user_name       text,
  review_date     date not null,
  metrics         jsonb not null default '{}'::jsonb,
  issue           text not null default '',
  tomorrow_focus  text not null default '',
  summary         text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(workspace_id, user_id, review_date)
);

comment on table public.daily_reviews is '每日复盘：顾问每天一条，metrics 为保存时业务快照，issue/tomorrow_focus/summary 为主观文本';
comment on column public.daily_reviews.user_id is '属主 profiles.id（auth.uid()），每日复盘按属主私有';
comment on column public.daily_reviews.user_name is '顾问展示名（保存时冗余，管理员团队列表免联表）';
comment on column public.daily_reviews.review_date is '复盘日历日期（YYYY-MM-DD，前端按 Asia/Shanghai 生成）';
comment on column public.daily_reviews.metrics is '保存时当日业务快照 JSON：addedCandidates/touchedCandidates/recommendations/interviews/offers/completedTodos/followups';

-- updated_at 自动维护（幂等：其他 SQL 文件已建过，此处 create or replace 兜底）
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_daily_reviews_touch on public.daily_reviews;
create trigger trg_daily_reviews_touch
  before update on public.daily_reviews
  for each row execute function public.touch_updated_at();

-- 管理员团队汇总查询：where workspace_id=? and review_date=? order by ...
create index if not exists idx_daily_reviews_workspace_date
  on public.daily_reviews (workspace_id, review_date desc);

-- ============ RLS ============
alter table public.daily_reviews enable row level security;

-- SELECT：管理员读全团队；顾问只读自己
drop policy if exists daily_reviews_read on public.daily_reviews;
create policy daily_reviews_read on public.daily_reviews
for select
using (
  public.is_workbench_admin()
  or user_id = auth.uid()
);

-- INSERT：只能插入自己的日报（管理员也不代写他人）
drop policy if exists daily_reviews_insert on public.daily_reviews;
create policy daily_reviews_insert on public.daily_reviews
for insert
with check (user_id = auth.uid());

-- UPDATE：只允许本人更新（管理员不代写他人日报）
drop policy if exists daily_reviews_update on public.daily_reviews;
create policy daily_reviews_update on public.daily_reviews
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- DELETE：第一版只允许本人删除（轻量，允许顾问撤销自己的日报）
drop policy if exists daily_reviews_delete on public.daily_reviews;
create policy daily_reviews_delete on public.daily_reviews
for delete
using (user_id = auth.uid());
