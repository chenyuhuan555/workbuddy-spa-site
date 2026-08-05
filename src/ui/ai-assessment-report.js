(function initAiAssessmentReport(root) {
  'use strict';

  const SECTION_RULES = [
    ['conclusion', /核心结论|核心判断|一句话推荐|推荐指数|综合判断|结论/i],
    ['strengths', /优势|卖点|亮点|匹配点|匹配亮点|核心能力/i],
    ['recommendation', /推荐话术|推荐语|沟通话术|客户话术/i],
    ['risks', /风险|风险提示|短板|缺口|注意事项/i],
    ['questions', /待确认|需确认|建议核实|追问|核实问题/i],
    ['structure', /人才画像|能力结构|结构图|能力模型/i],
  ];

  function cleanLine(value) {
    return String(value || '').replace(/^\s*(?:[-*+•✓✔⚠□]\s*|\d+[.)]\s*)/, '').replace(/^#+\s*/, '').trim();
  }

  function classifyHeading(value) {
    const text = cleanLine(value).replace(/[：:]+$/, '');
    return SECTION_RULES.find(([, rule]) => rule.test(text))?.[0] || '';
  }

  function parseScore(text) {
    const match = String(text || '').match(/(?:推荐指数|匹配度|匹配分|评分|综合评分)\s*[:：]?\s*(\d{1,3})\s*分?/i);
    if (!match) return null;
    return Math.max(0, Math.min(100, Number(match[1])));
  }

  function parseReport(text) {
    const raw = String(text || '').replace(/\r\n/g, '\n').trim();
    const lines = raw.split('\n');
    const sections = { conclusion: [], strengths: [], recommendation: [], risks: [], questions: [], structure: [], details: [] };
    let section = '';
    let mermaid = '';
    let inMermaid = false;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (/^```mermaid\s*$/i.test(line)) { inMermaid = true; continue; }
      if (inMermaid && /^```\s*$/.test(line)) { inMermaid = false; continue; }
      if (inMermaid) { mermaid += `${rawLine}\n`; continue; }
      if (!line) continue;
      if (/^[★☆\s]*推荐指数\s*[:：]?\s*\d{1,3}\s*分?$/i.test(line)) continue;
      const heading = line.match(/^#{1,3}\s+(.+)$/) || line.match(/^【(.+)】$/);
      if (heading) {
        section = classifyHeading(heading[1]);
        if (!section) section = 'details';
        continue;
      }
      const inferred = classifyHeading(line);
      if (inferred && !/^[-*+•✓✔⚠□]/.test(line) && line.length < 24) {
        section = inferred;
        continue;
      }
      const value = cleanLine(line);
      if (!value) continue;
      if (!section) section = sections.conclusion.length ? 'details' : 'conclusion';
      sections[section].push(value);
    }
    if (!sections.conclusion.length && sections.details.length) sections.conclusion.push(sections.details.shift());
    if (!sections.strengths.length) {
      sections.strengths = sections.details.filter(item => /经验|能力|熟悉|负责|主导|擅长|匹配/.test(item)).slice(0, 6);
      sections.details = sections.details.filter(item => !sections.strengths.includes(item));
    }
    if (!sections.risks.length) {
      sections.risks = sections.details.filter(item => /风险|缺口|不足|缺少|待确认|不确定|没有/.test(item)).slice(0, 5);
      sections.details = sections.details.filter(item => !sections.risks.includes(item));
    }
    if (!sections.questions.length) {
      sections.questions = sections.details.filter(item => /确认|核实|接受度|预期|意愿|地点|薪资/.test(item)).slice(0, 5);
      sections.details = sections.details.filter(item => !sections.questions.includes(item));
    }
    const recommendation = sections.recommendation.join('\n').trim();
    const detailText = sections.details.join('\n').trim();
    return {
      score: parseScore(raw),
      conclusion: sections.conclusion.join(' ').trim(),
      strengths: sections.strengths.slice(0, 8),
      recommendation,
      risks: sections.risks.slice(0, 8),
      questions: sections.questions.slice(0, 8),
      structure: sections.structure.join('\n').trim(),
      mermaid: mermaid.trim(),
      details: detailText,
    };
  }

  root.WorkBuddyAiAssessmentReport = Object.freeze({ parseReport });
})(typeof window !== 'undefined' ? window : globalThis);
