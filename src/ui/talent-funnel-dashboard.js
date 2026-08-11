;(function initTalentFunnelDashboard(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyTalentFunnelDashboard = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createTalentFunnelDashboardModule() {
  'use strict';

  const STAGES = Object.freeze([
    { key: 'imported', label: '已导入' },
    { key: 'contacted', label: '已触达' },
    { key: 'matched', label: '已匹配' },
    { key: 'interviewed', label: '已面试' },
    { key: 'offered', label: '已发 Offer' },
    { key: 'hired', label: '已入职' },
  ]);
  const SECTION_ORDER = Object.freeze(['funnel', 'bottlenecks', 'recommendations']);
  const REASON_LABELS = Object.freeze({
    cannot_contact: '联系不上',
    no_interest: '候选人无意向',
    salary_mismatch: '薪资不匹配',
    tech_direction_mismatch: '技术方向不匹配',
    role_requirements_changed: '岗位要求变化',
    slow_company_feedback: '公司反馈慢',
    interview_failed: '面试未通过',
    offer_declined: 'Offer 被拒',
    accepted_other_opportunity: '候选人接受其他机会',
    other: '其他',
    unknown: '未说明',
  });

  function normalizeString(value) {
    return String(value || '').trim();
  }

  function normalizeRate(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  function formatRate(value) {
    const rate = normalizeRate(value);
    return rate === null ? '—' : `${Math.round(rate * 100)}%`;
  }

  function formatReason(reasonCode) {
    const code = normalizeString(reasonCode) || 'unknown';
    return REASON_LABELS[code] || code;
  }

  function emptyModel({ companyId = '', companyName = '' } = {}) {
    return {
      companyId: normalizeString(companyId),
      companyName: normalizeString(companyName),
      sectionOrder: SECTION_ORDER,
      channels: [],
      bottlenecks: [],
      recommendations: [],
      aiSlot: {
        status: 'reserved',
        title: 'AI 优化建议（预留）',
        message: '后续可接入 AI 生成建议；当前结论仅使用系统事实。',
      },
      hasData: false,
      emptyMessage: '暂无该公司的渠道漏斗数据，请先记录试点事件。',
    };
  }

  function normalizeChannelDictionary(channels) {
    return new Map((Array.isArray(channels) ? channels : [])
      .map(channel => [normalizeString(channel?.id || channel?.channelId), normalizeString(channel?.name || channel?.channelName)])
      .filter(([id]) => id));
  }

  function buildStageRows(channel) {
    const counts = channel?.counts || {};
    const adjacentRates = channel?.adjacentRates || {};
    const cumulativeRates = channel?.cumulativeRates || {};
    return STAGES.map((stage, index) => {
      const previousStage = STAGES[index - 1];
      const rateKey = previousStage ? `${previousStage.key}To${stage.key[0].toUpperCase()}${stage.key.slice(1)}` : '';
      const cumulativeKey = index > 0 ? `importedTo${stage.key[0].toUpperCase()}${stage.key.slice(1)}` : '';
      return {
        key: stage.key,
        label: stage.label,
        count: Number(counts[stage.key]) || 0,
        adjacentRate: previousStage ? normalizeRate(adjacentRates[rateKey]) : null,
        cumulativeRate: index > 0 ? normalizeRate(cumulativeRates[cumulativeKey]) : null,
      };
    });
  }

  function buildBottlenecks(bottlenecks) {
    return (Array.isArray(bottlenecks) ? bottlenecks : []).map(item => ({
      ...item,
      stageLabel: STAGES.find(stage => stage.key === item?.stage)?.label || normalizeString(item?.stage),
      dropCount: Number(item?.dropCount) || 0,
      dropRate: normalizeRate(item?.dropRate),
      dropRateText: formatRate(item?.dropRate),
      reasonCounts: (Array.isArray(item?.reasonCounts) ? item.reasonCounts : []).map(reason => ({
        reasonCode: normalizeString(reason?.reasonCode) || 'unknown',
        label: formatReason(reason?.reasonCode),
        count: Number(reason?.count) || 0,
      })),
    }));
  }

  function buildRecommendations(bottlenecks, hasData) {
    if (!hasData) return [];
    if (!bottlenecks.length) {
      return [{
        kind: 'fact',
        text: '当前已记录事件中未发现失败掉点，建议保持现有推进节奏并持续记录结果。',
      }];
    }
    return bottlenecks.slice(0, 3).map(bottleneck => {
      const topReason = bottleneck.reasonCounts[0];
      const reasonText = topReason ? `主要原因是${topReason.label}（${topReason.count} 个）` : '暂无原因明细';
      return {
        kind: 'fact',
        text: `${bottleneck.stageLabel}阶段掉点 ${bottleneck.dropCount} 个，占该阶段 ${bottleneck.dropRateText}；${reasonText}。`,
      };
    });
  }

  function buildTalentFunnelDashboardModel({ companyId, companyName, analytics = {}, channels } = {}) {
    const dictionary = normalizeChannelDictionary(channels);
    const sourceChannels = Array.isArray(analytics.channels) && analytics.channels.length
      ? analytics.channels
      : (Array.isArray(channels) ? channels : []);
    const normalizedChannels = sourceChannels.map(channel => {
      const channelId = normalizeString(channel?.channelId || channel?.id);
      return {
        channelId,
        channelName: dictionary.get(channelId) || normalizeString(channel?.channelName || channel?.name) || channelId,
        stages: buildStageRows(channel),
      };
    });
    const bottlenecks = buildBottlenecks(analytics.bottlenecks);
    const hasData = normalizedChannels.some(channel => channel.stages.some(stage => stage.count > 0)) || bottlenecks.length > 0;
    return {
      ...emptyModel({ companyId, companyName }),
      channels: normalizedChannels,
      bottlenecks,
      recommendations: buildRecommendations(bottlenecks, hasData),
      hasData,
    };
  }

  function createState() {
    return {
      companyId: '',
      loading: false,
      status: 'idle',
      error: '',
      model: emptyModel(),
      analytics: null,
      ai: { loading: false, error: '', summary: '', suggestions: [] },
    };
  }

  function formatLoadError(kind, error) {
    const code = normalizeString(error?.code || error?.message);
    const subject = kind === 'channels' ? '渠道字典' : '漏斗事件';
    if (code === 'BACKEND_REQUEST_FAILED') {
      const file = kind === 'channels' ? 'supabase/talent-source-channels.sql' : 'supabase/talent-funnel-events.sql';
      return `${subject}读取失败：请先在 Supabase SQL Editor 执行 ${file}，并确认当前账号有读取权限。`;
    }
    if (code === 'AUTH_REQUIRED') return `${subject}读取失败：登录状态已失效，请重新登录后再试。`;
    if (code === 'ACCOUNT_DISABLED') return `${subject}读取失败：当前账号已被停用，请联系管理员。`;
    if (code === 'WRITE_FORBIDDEN') return `${subject}读取失败：当前账号没有访问该数据的权限，请联系管理员。`;
    return `${subject}读取失败：${code || '请检查登录状态和网络连接'}。`;
  }

  function createTalentFunnelDashboardController({
    state = createState(),
    analytics,
    getChannels,
    getEventsByCompany,
    getScope,
    getCompanyName,
  } = {}) {
    let requestId = 0;

    function reset(companyId = '') {
      const id = normalizeString(companyId);
      Object.assign(state, {
        companyId: id,
        loading: Boolean(id),
        status: id ? 'loading' : 'idle',
        error: '',
        model: emptyModel({ companyId: id, companyName: typeof getCompanyName === 'function' ? getCompanyName(id) : '' }),
        analytics: null,
        ai: { loading: false, error: '', summary: '', suggestions: [] },
      });
    }

    async function loadCompany(companyId) {
      const id = normalizeString(companyId);
      const currentRequestId = ++requestId;
      reset(id);
      if (!id) return state;
      try {
        const [channelResult, eventResult] = await Promise.allSettled([
          typeof getChannels === 'function' ? getChannels() : [],
          typeof getEventsByCompany === 'function' ? getEventsByCompany(id) : [],
        ]);
        const errors = [];
        const channels = channelResult.status === 'fulfilled' ? channelResult.value : (errors.push(formatLoadError('channels', channelResult.reason)), []);
        const events = eventResult.status === 'fulfilled' ? eventResult.value : (errors.push(formatLoadError('events', eventResult.reason)), []);
        if (currentRequestId !== requestId) return state;
        if (errors.length) {
          Object.assign(state, { loading: false, status: 'error', error: errors.join('；'), model: emptyModel({ companyId: id, companyName: typeof getCompanyName === 'function' ? getCompanyName(id) : '' }) });
          return state;
        }
        const scope = typeof getScope === 'function' ? getScope() : {};
        const result = analytics.buildTalentFunnelAnalytics({
          events: Array.isArray(events) ? events : [],
          channels: Array.isArray(channels) ? channels : [],
          companyId: id,
          baselineAt: scope?.baselineAt || '',
        });
        Object.assign(state, {
          loading: false,
          status: 'ready',
          analytics: result,
          ai: { loading: false, error: '', summary: '', suggestions: [] },
          model: buildTalentFunnelDashboardModel({
            companyId: id,
            companyName: typeof getCompanyName === 'function' ? getCompanyName(id) : '',
            analytics: result,
            channels,
          }),
        });
      } catch (error) {
        if (currentRequestId !== requestId) return state;
        Object.assign(state, {
          loading: false,
          status: 'error',
          error: error?.message || '渠道漏斗加载失败',
          model: emptyModel({ companyId: id, companyName: typeof getCompanyName === 'function' ? getCompanyName(id) : '' }),
          analytics: null,
          ai: { loading: false, error: '', summary: '', suggestions: [] },
        });
      }
      return state;
    }

    async function analyzeWithAi({ aiService } = {}) {
      if (!aiService?.analyze || !state.model.hasData || !state.analytics) return state;
      state.ai = { loading: true, error: '', summary: '', suggestions: [] };
      try {
        const result = await aiService.analyze({ companyName: state.model.companyName, analytics: state.analytics });
        state.ai = { loading: false, error: '', summary: result.summary, suggestions: result.suggestions };
      } catch (error) {
        state.ai = { loading: false, error: error?.message || 'AI 优化建议生成失败', summary: '', suggestions: [] };
      }
      return state;
    }

    return Object.freeze({ state, reset, loadCompany, analyzeWithAi });
  }

  return Object.freeze({
    STAGES,
    SECTION_ORDER,
    createState,
    emptyModel,
    formatRate,
    buildTalentFunnelDashboardModel,
    createTalentFunnelDashboardController,
  });
});
