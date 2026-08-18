(function (global) {
  'use strict';

  function normalizeDuplicateText(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^\u4e00-\u9fa5a-z0-9+#.]/g, '')
      .slice(0, 12000);
  }

  function makeTextShingles(text, size = 4, limit = 900) {
    const clean = normalizeDuplicateText(text);
    const set = new Set();
    if (clean.length < size) return set;
    const step = clean.length > 4000 ? 2 : 1;
    for (let i = 0; i <= clean.length - size && set.size < limit; i += step) {
      set.add(clean.slice(i, i + size));
    }
    return set;
  }

  function setOverlapRatio(a, b) {
    if (!a || !b || a.size === 0 || b.size === 0) return 0;
    let overlap = 0;
    const small = a.size <= b.size ? a : b;
    const large = a.size <= b.size ? b : a;
    small.forEach(value => { if (large.has(value)) overlap++; });
    return overlap / Math.max(small.size, 1);
  }

  function intersectValues(a, b) {
    const bs = new Set((b || []).map(value => String(value).toLowerCase()));
    return (a || []).filter(value => bs.has(String(value).toLowerCase()));
  }

  function compareDuplicateSignatures(target, other) {
    const reasons = [];
    const surnameConflict = target.surname && other.surname && target.surname !== other.surname;
    const genderConflict = target.gender && other.gender && target.gender !== other.gender;
    if (surnameConflict || genderConflict) return null;
    if (target.surname && other.surname) reasons.push(`姓氏相同：${target.surname}`);
    if (target.gender && other.gender) reasons.push(`性别相同：${target.gender}`);
    if (target.dataKey && other.dataKey && target.dataKey === other.dataKey) {
      return { score: 99, reasons: [...reasons, '原始简历文件内容一致'] };
    }
    const nameSame = target.normalizedName && other.normalizedName && target.normalizedName === other.normalizedName;
    if (nameSame) reasons.push('文件名高度一致');
    const textRatio = setOverlapRatio(target.textShingles, other.textShingles);
    if (textRatio >= 0.92) reasons.push(`简历正文高度一致：${Math.round(textRatio * 100)}%`);
    const companyOverlap = intersectValues(target.companies, other.companies);
    if (companyOverlap.length) reasons.push(`工作公司重合：${companyOverlap.slice(0, 3).join('、')}`);
    const tokenOverlap = intersectValues(target.tokens, other.tokens);
    const tokenBase = Math.min(target.tokens.length, other.tokens.length) || 1;
    const tokenRatio = tokenOverlap.length / tokenBase;
    if (tokenRatio >= 0.55 && tokenOverlap.length >= 8) reasons.push(`经历关键词高度重合：${tokenOverlap.slice(0, 6).join('、')}`);
    let score = 0;
    if (textRatio >= 0.98) score = 99;
    else if (textRatio >= 0.95) score = 98;
    else if (textRatio >= 0.92) score = 96;
    else if (nameSame && target.normalizedName.length >= 4) score = 95;
    else if (nameSame && companyOverlap.length >= 1 && tokenRatio >= 0.5) score = 96;
    else if (companyOverlap.length >= 2 && tokenRatio >= 0.72) score = 96;
    else if (companyOverlap.length >= 1 && tokenRatio >= 0.82) score = 95;
    else if (nameSame && tokenRatio >= 0.75) score = 95;
    if (score < 95) return null;
    if (reasons.length === 0) reasons.push('简历内容高度一致');
    return { score, reasons };
  }

  function serializeDuplicateMatch(item) {
    return {
      resumeId: item.resume?.id || '',
      resumeName: item.resume?.name || '',
      jobId: item.job?.id || '',
      company: item.job?.company || '',
      posId: item.pos?.id || '',
      position: item.pos?.name || '',
      colName: item.col?.name || '',
      score: item.score,
      reasons: item.reasons || [],
    };
  }

  global.WorkBuddyDuplicateMatchingHelpers = {
    normalizeDuplicateText,
    makeTextShingles,
    setOverlapRatio,
    intersectValues,
    compareDuplicateSignatures,
    serializeDuplicateMatch,
  };
})(typeof window !== 'undefined' ? window : globalThis);
