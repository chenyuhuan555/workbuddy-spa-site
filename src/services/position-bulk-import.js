function text(value) { return String(value ?? '').trim(); }

function splitCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"' && quoted) { cell += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === ',' && !quoted) { cells.push(cell); cell = ''; continue; }
    cell += char;
  }
  cells.push(cell);
  return cells.map(text);
}

function parseCsvRecords(raw) {
  const records = [];
  let record = '';
  let quoted = false;
  for (const line of String(raw || '').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    record += (record ? '\n' : '') + line;
    let quotes = 0;
    for (let i = 0; i < line.length; i += 1) if (line[i] === '"' && line[i - 1] !== '\\') quotes += 1;
    if (quotes % 2) quoted = !quoted;
    if (!quoted) { records.push(record); record = ''; }
  }
  if (record) records.push(record);
  return records.filter(line => text(line));
}

function headerKey(value) {
  const key = text(value).toLowerCase().replace(/[\s_\-]/g, '');
  if (['岗位名称', '岗位', '职位', 'position', 'title', 'name'].includes(key)) return 'title';
  if (['工作城市', '工作地点', '地点', '城市', 'base', 'location', 'city'].includes(key)) return 'city';
  if (['薪资范围', '薪资', '预算', 'salary', 'compensation'].includes(key)) return 'salary';
  if (['岗位职责', '职责', '岗位描述', 'jd', 'description', 'detail'].includes(key)) return 'description';
  if (['岗位负责人', '负责人', 'owner'].includes(key)) return 'owner';
  if (['技能关键词', '关键词', 'skills', 'keywords'].includes(key)) return 'skills';
  return '';
}

export function parsePositionCsv(raw) {
  const records = parseCsvRecords(raw);
  if (records.length < 2) return [];
  const headers = splitCsvLine(records[0]).map(headerKey);
  return records.slice(1).map(record => {
    const cells = splitCsvLine(record);
    const row = { title: '', city: '', salary: '', description: '', owner: '', skills: [] };
    headers.forEach((key, index) => {
      if (!key) return;
      const value = text(cells[index]);
      if (key === 'skills') row.skills = value.split(/[，,;；、]/).map(text).filter(Boolean);
      else row[key] = value;
    });
    return row;
  }).filter(row => row.title);
}

function labeledValue(block, labels) {
  const pattern = labels.join('|');
  const match = block.match(new RegExp(`(?:${pattern})\\s*[:：]\\s*([^\\n]+)`, 'i'));
  return match ? text(match[1]) : '';
}

export function splitPositionText(raw) {
  const source = String(raw || '').trim();
  if (!source) return [];
  const blocks = source.split(/(?:^|\n)\s*(?:---+|===+|岗位\s*\d+\s*[:：]?)(?:\s*\n|$)/im).map(text).filter(Boolean);
  return blocks.map(block => ({
    title: labeledValue(block, ['岗位名称', '岗位', '职位']) || text((block.match(/^(?:岗位名称|岗位|职位)\s*[:：]?\s*(.+)$/im) || [])[1]),
    city: labeledValue(block, ['工作地点', '工作城市', '地点', '城市', 'Base']),
    salary: labeledValue(block, ['薪资范围', '薪资', '预算']),
    owner: labeledValue(block, ['岗位负责人', '负责人']),
    description: labeledValue(block, ['岗位职责', '岗位描述', '要求']) || block,
    skills: [],
  })).filter(row => row.title || row.description);
}

export function normalizeImportedPositions(input) {
  const rows = Array.isArray(input) ? input : [];
  return rows.map(source => {
    const row = source && typeof source === 'object' ? source : {};
    const rawSkills = row.skills ?? row.keywords ?? row.skillKeywords ?? [];
    return {
      title: text(row.title ?? row.positionName ?? row.name),
      city: text(row.city ?? row.location ?? row.base),
      salary: text(row.salary ?? row.compensation ?? row.budget),
      owner: text(row.owner ?? row.recruiter),
      description: text(row.description ?? row.detail ?? row.requirements ?? row.jd),
      skills: (Array.isArray(rawSkills) ? rawSkills : String(rawSkills).split(/[，,;；、]/)).map(text).filter(Boolean),
    };
  }).filter(row => row.title);
}

export function markDuplicatePositions(rows, existingPositions = []) {
  const existing = new Set(existingPositions.map(row => text(row?.title).toLowerCase()).filter(Boolean));
  const seen = new Set();
  return normalizeImportedPositions(rows).map(row => {
    const key = row.title.toLowerCase();
    let duplicateType = '';
    if (key && seen.has(key)) duplicateType = 'batch';
    else if (key && existing.has(key)) duplicateType = 'existing';
    if (key) seen.add(key);
    return { ...row, duplicateType };
  });
}

export function buildPositionBulkImportMessages({ companyName = '', rawText = '' } = {}) {
  return [
    {
      role: 'system',
      content: '你是招聘岗位结构化助手。只根据用户提供的岗位文本提取信息，不要编造。严格输出 JSON 对象：{"positions":[{"title":"","city":"","salary":"","owner":"","description":"","skills":[]}]}。每个独立岗位一条记录；无法识别岗位名称的内容不要输出。',
    },
    {
      role: 'user',
      content: `请把以下属于“${text(companyName) || '当前公司'}”的岗位内容拆分成岗位数组。保留职责和要求原意，skills 输出技能关键词数组，找不到的字段为空字符串或空数组。\n\n岗位原文：\n${String(rawText || '').trim()}`,
    },
  ];
}

export function normalizePositionBulkAiResult(result) {
  const source = result && typeof result === 'object' ? result : {};
  const rows = Array.isArray(source) ? source : source.positions;
  return normalizeImportedPositions(rows);
}

if (typeof window !== 'undefined') window.WorkBuddyPositionBulkImport = {
  parsePositionCsv, splitPositionText, normalizeImportedPositions, markDuplicatePositions,
  buildPositionBulkImportMessages, normalizePositionBulkAiResult,
};
