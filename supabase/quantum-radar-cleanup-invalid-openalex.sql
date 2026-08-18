-- 清理 OpenAlex 旧版本生成的异常主键。
-- 只删除明确错误的 openalex:None，不影响其他人才线索。
delete from public.talent_leads
where id = 'openalex:None';
