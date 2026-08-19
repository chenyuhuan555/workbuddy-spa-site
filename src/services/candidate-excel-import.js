function text(value) { return String(value ?? '').trim(); }
function key(value) { return text(value).toLowerCase().replace(/[\s_\-\/（）()]/g, ''); }
function normalizeEmail(value) { return text(value).toLowerCase(); }
function normalizePhone(value) { return text(value).replace(/[^\d+]/g, ''); }

export function headerKey(value) {
    const normalized = key(value);
    if (['推荐批次', '批次', 'batch'].includes(normalized)) return 'batch';
    if (['姓名', '候选人姓名', 'name', 'candidate'].includes(normalized)) return 'name';
    if (['当前职位', '职位', '岗位', '职务', 'title', 'currenttitle'].includes(normalized)) return 'currentTitle';
    if (['当前公司', '公司', '任职公司', 'company', 'currentcompany'].includes(normalized)) return 'currentCompany';
    if (['所在城市', '城市', '工作地点', '地点', 'city', 'location'].includes(normalized)) return 'city';
    if (['学历', '教育背景', 'education', 'degree'].includes(normalized)) return 'education';
    if (['匹配度', '匹配分', '评分', 'score', 'matchscore'].includes(normalized)) return 'matchScore';
    if (['公开联系方式', '联系方式', '邮箱电话', 'contact', 'contactinfo'].includes(normalized)) return 'contact';
    if (['联系方式类型', '联系方式类别', 'contacttype'].includes(normalized)) return 'contactType';
    if (['核验状态', '验证状态', '核验', 'verificationstatus'].includes(normalized)) return 'verificationStatus';
    if (['联系方式来源', '来源链接', '来源', 'source', 'sourcelink'].includes(normalized)) return 'sourceUrl';
    if (['个人职业主页', '职业主页', '个人主页', 'linkedin', 'profileurl'].includes(normalized)) return 'personalProfileUrl';
    if (['个人信息与背景', '个人背景', '背景', 'background', 'profile'].includes(normalized)) return 'background';
    if (['一句话履历总结', '履历总结', '候选人总结', 'summary'].includes(normalized)) return 'summary';
    if (['核验备注', '备注', '说明', 'note', 'notes'].includes(normalized)) return 'note';
    return '';
  }

const AI_FIELD_ALIASES = {
  name: 'name', candidate: 'name', candidateName: 'name',
  phone: 'phone', mobile: 'phone', telephone: 'phone',
  email: 'email', workEmail: 'email', publicEmail: 'email',
  contact: 'contact', contactInfo: 'contact', publicContact: 'contact',
  currentCompany: 'currentCompany', company: 'currentCompany', affiliation: 'currentCompany', organization: 'currentCompany', institution: 'currentCompany',
  currentTitle: 'currentTitle', title: 'currentTitle', role: 'currentTitle', position: 'currentTitle',
  city: 'city', location: 'city',
  education: 'education', degree: 'education',
  matchScore: 'matchScore', score: 'matchScore',
  personalProfileUrl: 'personalProfileUrl', profileUrl: 'personalProfileUrl', linkedin: 'personalProfileUrl',
  sourceUrl: 'sourceUrl', contactSource: 'sourceUrl', source: 'sourceUrl',
  background: 'background', profile: 'background', bio: 'background',
  summary: 'summary', resumeSummary: 'summary',
  contactType: 'contactType', verificationStatus: 'verificationStatus', note: 'note', batch: 'batch',
};

function normalizeAiField(value) {
  const raw = String(value || '').trim();
  if (AI_FIELD_ALIASES[raw]) return AI_FIELD_ALIASES[raw];
  const normalized = key(raw);
  const match = Object.entries(AI_FIELD_ALIASES).find(([alias]) => key(alias) === normalized);
  return match ? match[1] : '';
}

export function buildCandidateExcelAiMappingMessages({ headers = [], sampleRows = [] } = {}) {
  const fields = Object.keys(AI_FIELD_ALIASES).filter((field, index, list) => list.indexOf(field) === index).join(', ');
  return [
    { role: 'system', content: `你是 Excel 候选人字段适配器。只根据表头和样例值判断字段含义，不要编造数据。严格输出 JSON：{"mapping":{"原始表头":"标准字段"},"confidence":{"原始表头":0.0}}。标准字段只能使用 name, phone, email, contact, currentCompany, currentTitle, city, education, matchScore, personalProfileUrl, sourceUrl, background, summary, contactType, verificationStatus, note, batch。无法判断的表头不要映射。可用标准字段：${fields}` },
    { role: 'user', content: `请为以下 Excel 表头建立映射，并保留无法识别的列不映射。表头：${JSON.stringify(headers)}\n样例数据：${JSON.stringify(sampleRows)}` },
  ];
}

export function normalizeCandidateExcelAiMapping(result, headers = []) {
  const source = result && typeof result === 'object' ? result : {};
  const rawMapping = source.mapping && typeof source.mapping === 'object' ? source.mapping : source;
  const headerList = Array.isArray(headers) ? headers.map(text) : [];
  const mapping = {};
  Object.entries(rawMapping || {}).forEach(([header, field]) => {
    const matchingHeader = headerList.find(item => item === text(header)) || text(header);
    const canonical = normalizeAiField(field);
    if (matchingHeader && canonical) mapping[matchingHeader] = canonical;
  });
  const confidence = {};
  const rawConfidence = source.confidence && typeof source.confidence === 'object' ? source.confidence : {};
  Object.entries(rawConfidence).forEach(([header, value]) => {
    const number = Number(value);
    if (Number.isFinite(number)) confidence[text(header)] = Math.max(0, Math.min(1, number));
  });
  return { mapping, confidence };
}

  function parseScore(value) {
    const match = text(value).match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  }

export function splitContacts(value) {
    const raw = text(value);
    const parts = raw.split(/[\/、,，;；|]+/).map(text).filter(Boolean);
    const emails = parts.filter(part => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part));
    const phones = parts.filter(part => !emails.includes(part) && /\+?\d[\d\s().-]{5,}/.test(part)).map(normalizePhone).filter(Boolean);
    return { emails: [...new Set(emails.map(normalizeEmail))], phones: [...new Set(phones)], raw };
  }

export function normalizeCandidateExcelRows(matrix, { headerMap = {} } = {}) {
    const source = Array.isArray(matrix) ? matrix : [];
    const headerIndex = source.findIndex(row => Array.isArray(row) && row.some(cell => headerKey(cell) === 'name' || headerMap[text(cell)] === 'name' || headerMap[key(cell)] === 'name'));
    if (headerIndex < 0) return [];
    const rawHeaders = source[headerIndex].map(text);
    const headers = rawHeaders.map(header => headerMap[header] || headerMap[key(header)] || headerKey(header));
    return source.slice(headerIndex + 1).map((cells, index) => {
      const raw = {};
      const extraFields = {};
      headers.forEach((field, column) => {
        const value = text(cells?.[column]);
        if (field) raw[field] = value;
        else if (rawHeaders[column] && value) extraFields[rawHeaders[column]] = value;
      });
      const contacts = splitContacts(raw.contact);
      return {
        rowNumber: headerIndex + index + 2,
        batch: text(raw.batch),
        name: text(raw.name),
        currentTitle: text(raw.currentTitle),
        currentCompany: text(raw.currentCompany),
        city: text(raw.city),
        education: text(raw.education),
        matchScore: parseScore(raw.matchScore),
        email: contacts.emails[0] || '',
        phone: contacts.phones[0] || '',
        contactRaw: contacts.raw,
        contactType: text(raw.contactType),
        verificationStatus: text(raw.verificationStatus),
        sourceUrl: text(raw.sourceUrl),
        personalProfileUrl: text(raw.personalProfileUrl),
        background: text(raw.background),
        summary: text(raw.summary),
        extraFields,
        note: text(raw.note),
        duplicateType: '',
        status: text(raw.name) ? (contacts.emails.length || contacts.phones.length ? 'ready' : 'needs_review') : 'invalid',
        error: text(raw.name) ? '' : '缺少姓名',
      };
    }).filter(row => row.name || row.contactRaw || row.currentCompany || row.currentTitle);
}

export function applyCandidateExcelAiMapping(matrix, mapping) {
  return normalizeCandidateExcelRows(matrix, { headerMap: mapping?.mapping || {} });
}

export function markDuplicateCandidateRows(rows, existingCandidates = []) {
    const activeCandidates = (Array.isArray(existingCandidates) ? existingCandidates : []).filter(row => !row?.deletedAt);
    const existingEmails = new Set(activeCandidates.map(row => normalizeEmail(row?.email)).filter(Boolean));
    const existingPhones = new Set(activeCandidates.map(row => normalizePhone(row?.phone)).filter(Boolean));
    const existingNames = new Set(activeCandidates.map(row => `${text(row?.name).toLowerCase()}__${text(row?.currentCompany).toLowerCase()}`).filter(keyValue => !keyValue.startsWith('__')));
    const seenEmails = new Set();
    const seenPhones = new Set();
    const seenNames = new Set();
    return (Array.isArray(rows) ? rows : []).map(row => {
      const email = normalizeEmail(row.email);
      const phone = normalizePhone(row.phone);
      const nameKey = `${text(row.name).toLowerCase()}__${text(row.currentCompany).toLowerCase()}`;
      let duplicateType = '';
      if ((email && seenEmails.has(email)) || (phone && seenPhones.has(phone)) || (nameKey !== '__' && seenNames.has(nameKey))) duplicateType = 'batch';
      else if ((email && existingEmails.has(email)) || (phone && existingPhones.has(phone)) || (nameKey !== '__' && existingNames.has(nameKey))) duplicateType = 'existing';
      if (email) seenEmails.add(email);
      if (phone) seenPhones.add(phone);
      if (nameKey !== '__') seenNames.add(nameKey);
      return { ...row, duplicateType, status: duplicateType ? 'duplicate' : row.status };
    });
  }

export function buildCandidateFields(row, { channelName = '倍罗', owner = '' } = {}) {
    const extraFields = row.extraFields && typeof row.extraFields === 'object' ? row.extraFields : {};
    const extraParts = Object.entries(extraFields).map(([label, value]) => `${label}：${value}`).filter(Boolean);
    const profileParts = [row.summary, row.background, row.education && `学历：${row.education}`, row.contactType && `联系方式：${row.contactType}`, row.verificationStatus && `核验：${row.verificationStatus}`, row.personalProfileUrl && `个人职业主页：${row.personalProfileUrl}`, row.sourceUrl && `联系方式来源：${row.sourceUrl}`, row.note, ...extraParts].filter(Boolean);
    return {
      name: text(row.name), phone: text(row.phone), email: text(row.email), currentCompany: text(row.currentCompany), currentTitle: text(row.currentTitle), city: text(row.city),
      education: text(row.education), summary: text(row.summary), profileText: text(row.profileText) || profileParts.join('；'), source: text(channelName) || '倍罗', sourceChannelName: text(channelName) || '倍罗', sourceUrl: text(row.sourceUrl), personalProfileUrl: text(row.personalProfileUrl), extraFields, matchScore: row.matchScore,
      owner: text(owner),
    };
  }

export function buildCandidateExcelAiMessages({ rows = [], channelName = '倍罗' } = {}) {
    return [
      { role: 'system', content: '你是候选人信息整理助手。只根据输入的表格行整理候选人信息，不要编造。严格输出 JSON：{"candidates":[{"rowNumber":0,"name":"","currentTitle":"","currentCompany":"","city":"","education":"","email":"","phone":"","profileText":""}]}。保留原始事实，无法判断的字段留空。' },
      { role: 'user', content: `请整理以下来自“${text(channelName) || '候选人渠道'}”的候选人表格行，保持 rowNumber 不变，每行对应一个候选人：\n${JSON.stringify(rows)}` },
    ];
  }

export function normalizeCandidateExcelAiResult(result, originalRows = []) {
    const aiRows = Array.isArray(result) ? result : result?.candidates;
    if (!Array.isArray(aiRows)) return normalizeCandidateExcelRows([]);
    const aiByRow = new Map(aiRows.map(item => [Number(item?.rowNumber), item]));
    return (Array.isArray(originalRows) ? originalRows : aiRows).map((original, index) => {
      const matched = aiByRow.get(Number(original?.rowNumber));
      const source = matched && typeof matched === 'object' ? matched : {};
      return {
        ...original,
        name: text(source.name) || original.name,
        currentTitle: text(source.currentTitle) || original.currentTitle,
        currentCompany: text(source.currentCompany) || original.currentCompany,
        city: text(source.city) || original.city,
        education: text(source.education) || original.education,
        email: normalizeEmail(source.email) || original.email,
        phone: normalizePhone(source.phone) || original.phone,
        profileText: text(source.profileText) || original.profileText,
        status: (text(source.name) || original.name) ? (text(source.email) || text(source.phone) || original.email || original.phone ? 'ready' : 'needs_review') : 'invalid',
        error: (text(source.name) || original.name) ? '' : '缺少姓名',
      };
    }).filter(row => row.name || row.contactRaw || row.currentCompany || row.currentTitle);
  }

if (typeof window !== 'undefined') window.WorkBuddyCandidateExcelImport = {
  headerKey, splitContacts, normalizeCandidateExcelRows, markDuplicateCandidateRows,
  buildCandidateFields, buildCandidateExcelAiMessages, buildCandidateExcelAiMappingMessages, normalizeCandidateExcelAiMapping, applyCandidateExcelAiMapping, normalizeCandidateExcelAiResult,
};
