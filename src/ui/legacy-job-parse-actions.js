export function fallbackParseJobText(rawText) {
  const raw = String(rawText || '').trim();
  if (!raw) return null;
  const lines = raw.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const firstLine = lines[0] || raw;
  const locationMatch = raw.match(/(?:工作地点|地点|城市|base|Base|BASE)[:：\s]*([^\n，,；;。]{2,20})/i)
    || raw.match(/(?:上海|北京|深圳|广州|杭州|成都|南京|苏州|武汉|西安|重庆|天津|厦门|合肥|长沙|郑州|青岛|宁波|无锡|佛山)/);
  const location = locationMatch ? (locationMatch[1] || locationMatch[0]).trim() : '';
  const recruitMatch = firstLine.match(/^(.{2,40}?)(?:招聘|招|急招|诚聘|需要|寻访)(.{2,40}?)(?:，|,|。|；|;|$)/);
  let company = '';
  let positionName = '';
  if (recruitMatch) {
    company = recruitMatch[1].trim(); positionName = recruitMatch[2].trim();
  } else {
    const companyMatch = raw.match(/(?:公司|企业|客户)[:：\s]*([^\n，,；;。]{2,40})/);
    const posMatch = raw.match(/(?:岗位|职位|职务|招聘)[:：\s]*([^\n，,；;。]{2,40})/);
    company = companyMatch ? companyMatch[1].trim() : '';
    positionName = posMatch ? posMatch[1].trim() : firstLine.slice(0, 32);
  }
  return { company, positionName, location, detail: raw };
}

export function createLegacyJobParseActions({
  form,
  textParseRaw,
  textParseStatus,
  textParseError,
  ocrImage,
  ocrStatus,
  ocrError,
  ensureTesseractDependency,
  extractJobInfoWithDeepSeek,
  applyStructured: applyStructuredOverride,
  addPositionRow = () => {},
  showToast = () => {},
}) {
  function applyStructured(structured) {
    if (!structured) return false;
    if (typeof applyStructuredOverride === 'function') return applyStructuredOverride(structured);
    if (structured.company) form.company = structured.company;
    if (structured.positionName) {
      const first = form.positions[0];
      if (first.name.trim() || first.detail.trim()) addPositionRow();
      form.positions[form.positions.length - 1].name = structured.positionName;
    }
    if (structured.location || structured.detail) {
      const last = form.positions[form.positions.length - 1];
      const prefix = structured.location ? `工作地点：${structured.location}\n` : '';
      if (structured.location) last.location = structured.location;
      if (!last.detail.includes(structured.detail || '')) last.detail = prefix + (structured.detail || '');
    }
    return true;
  }
  async function parseJobText() {
    const raw = String(textParseRaw.value || '').trim();
    if (!raw || raw.length < 10) { textParseStatus.value = 'error'; textParseError.value = '请输入至少 10 个字符的岗位描述'; return; }
    textParseStatus.value = 'ai'; textParseError.value = '';
    try {
      let structured;
      try { structured = await extractJobInfoWithDeepSeek(raw); }
      catch (error) { structured = fallbackParseJobText(raw); if (structured) showToast('AI 解析暂不可用，已使用本地规则填充', 'error'); else throw error; }
      if (!applyStructured(structured)) throw new Error('未能提取有效信息');
      textParseStatus.value = 'done'; showToast('已自动解析并填写 ✓', 'success');
    } catch (error) { textParseStatus.value = 'error'; textParseError.value = error.message || '解析失败'; }
  }
  async function processOcrImage(file) {
    ocrImage.value = URL.createObjectURL(file); ocrStatus.value = 'loading'; ocrError.value = '';
    try {
      await ensureTesseractDependency();
      const result = await window.Tesseract.recognize(file, 'chi_sim+eng', { logger: () => {} });
      if (!result.data.text || result.data.text.trim().length < 10) throw new Error('未能识别到有效文字，请尝试更清晰的截图');
      ocrStatus.value = 'ai';
      if (!applyStructured(await extractJobInfoWithDeepSeek(result.data.text))) throw new Error('未能提取有效信息');
      ocrStatus.value = 'done';
    } catch (error) { ocrStatus.value = 'error'; ocrError.value = error.message || '识别失败'; }
  }
  return { parseJobText, processOcrImage, fallbackParseJobText };
}
if (typeof window !== 'undefined') window.WorkBuddyLegacyJobParseActions = { createLegacyJobParseActions, fallbackParseJobText };
