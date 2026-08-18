/**
 * ai-application-center.js — AI 应用中心领域逻辑（纯函数，无副作用）
 *
 * 职责：
 *   - 应用状态/类型常量与图标映射
 *   - normalizeApplication: 记录规范化（默认值、进度截断、更新日志清洗）
 *   - validateApplicationForm: 新增/编辑表单校验
 *   - computeStats / visibleApplications / sortApplications: 展示层统计与排序
 *   - seedDefaultAiApplications: 首次初始化默认应用（幂等，带种子标记）
 *
 * 数据归属：aiApplications 集合存放于 workbenchV2 bundle（随 workspace_state 云端同步），
 * 字段：id / name / url / description / category / status / progress / owner /
 *       remark / icon / changelog[{id,date,text}] / deletedAt / createdAt / updatedAt
 *
 * 加载方式：经典 <script> 标签，挂载到 window.WorkBuddyAiAppCenter
 *
 * @module services/ai-application-center
 */
;(function initAiApplicationCenter(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyAiAppCenter = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createAiApplicationCenterModule() {
  'use strict';

  const STATUS_OPTIONS = Object.freeze([
    Object.freeze({ key: 'building', label: '建设中' }),
    Object.freeze({ key: 'released', label: '已上线' }),
  ]);

  const STATUS_KEYS = STATUS_OPTIONS.map(item => item.key);

  const DEFAULT_ICON = '🤖';

  // 类型 → 图标映射；未知类型回退 DEFAULT_ICON
  const CATEGORY_ICONS = Object.freeze({
    人才关系图谱: '🕸️',
    行业人才网络: '🌐',
    招聘工作台: '💼',
    AI工具箱: '🧰',
    数据看板: '📊',
    知识库: '📚',
  });

  // 首次初始化时写入的默认应用（createdAt/updatedAt 由种子函数注入）
  const SEED_APPLICATIONS = Object.freeze([
    Object.freeze({
      name: '小蜜蜂·人才关系网',
      url: 'https://chenyuhuan555.github.io/talent-graph/persons/?domain=ai',
      description: '以图谱方式呈现人才关系网络，挖掘人选之间的隐藏连接，辅助定向寻访。',
      category: '人才关系图谱',
      status: 'building',
      progress: 70,
    }),
    Object.freeze({
      name: '量子人才网络',
      url: 'https://jiachiguoji-liangzikeji.coze.site/',
      description: '面向行业的人才网络平台，聚合人才与组织动态，支撑行业 mapping。',
      category: '行业人才网络',
      status: 'building',
      progress: 50,
    }),
    Object.freeze({
      name: 'Quantum Talent工作台',
      url: 'https://jiachi-lietou-console.coze.site/',
      description: '一站式猎头招聘工作台，AI 辅助人选筛选、推进管理与团队协作。',
      category: '招聘工作台',
      status: 'building',
      progress: 60,
    }),
  ]);

  const SEED_FLAG_KEY = 'aiApplicationsSeededAt';

  function nowIso() {
    return new Date().toISOString();
  }

  function makeId() {
    return `aiapp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function clampProgress(value) {
    const number = Math.round(Number(value));
    if (!Number.isFinite(number)) return 0;
    return Math.min(100, Math.max(0, number));
  }

  // 兼容历史中文状态值
  function normalizeStatus(value) {
    if (value === '已上线' || value === 'released') return 'released';
    return 'building';
  }

  function statusLabel(key) {
    const option = STATUS_OPTIONS.find(item => item.key === key);
    return option ? option.label : '建设中';
  }

  function resolveIcon(app = {}) {
    const own = String(app.icon || '').trim();
    if (own) return own;
    return CATEGORY_ICONS[String(app.category || '').trim()] || DEFAULT_ICON;
  }

  function normalizeChangelogEntry(entry, index) {
    const source = entry && typeof entry === 'object' ? entry : {};
    return {
      id: source.id || `chl_${Date.now().toString(36)}_${index}_${Math.random().toString(36).slice(2, 7)}`,
      date: String(source.date || '').slice(0, 10),
      text: String(source.text || '').trim(),
    };
  }

  function normalizeChangelog(list) {
    return (Array.isArray(list) ? list : [])
      .map((entry, index) => normalizeChangelogEntry(entry, index))
      .filter(entry => entry.text);
  }

  function isValidUrl(value) {
    return /^https?:\/\/\S+$/i.test(String(value || '').trim());
  }

  /**
   * 规范化一条应用记录：补齐默认值、截断进度、清洗更新日志。
   * 不校验必填项（那是 validateApplicationForm 的职责）。
   */
  function normalizeApplication(input = {}, { now = nowIso() } = {}) {
    const source = input && typeof input === 'object' ? input : {};
    return {
      id: source.id || makeId(),
      name: String(source.name || '').trim(),
      url: String(source.url || '').trim(),
      description: String(source.description || '').trim(),
      category: String(source.category || '').trim(),
      status: normalizeStatus(source.status),
      progress: clampProgress(source.progress),
      owner: String(source.owner || '').trim(),
      remark: String(source.remark || '').trim(),
      icon: String(source.icon || '').trim(),
      changelog: normalizeChangelog(source.changelog),
      deletedAt: source.deletedAt ? String(source.deletedAt) : '',
      createdAt: source.createdAt || now,
      updatedAt: source.updatedAt || now,
    };
  }

  /**
   * 校验新增/编辑表单，返回错误文案；通过时返回空字符串。
   */
  function validateApplicationForm(form = {}) {
    if (!String(form.name || '').trim()) return '请填写应用名称';
    if (!String(form.url || '').trim()) return '请填写应用链接';
    if (!isValidUrl(form.url)) return '应用链接需以 http:// 或 https:// 开头';
    if (!STATUS_KEYS.includes(form.status)) return '应用状态无效';
    return '';
  }

  function visibleApplications(apps) {
    return (Array.isArray(apps) ? apps : []).filter(item => item && !item.deletedAt);
  }

  // 最近更新在前；updatedAt 相同按 createdAt 倒序
  function sortApplications(apps) {
    return visibleApplications(apps).slice().sort((a, b) => {
      const byUpdated = String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
      if (byUpdated) return byUpdated;
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }

  /**
   * 统计卡片数据：总数 / 建设中 / 已上线 / 最近更新时间。
   */
  function computeStats(apps) {
    const visible = visibleApplications(apps);
    let lastUpdatedAt = '';
    visible.forEach(item => {
      if (String(item.updatedAt || '') > lastUpdatedAt) lastUpdatedAt = String(item.updatedAt || '');
    });
    return {
      total: visible.length,
      building: visible.filter(item => item.status === 'building').length,
      released: visible.filter(item => item.status === 'released').length,
      lastUpdatedAt,
    };
  }

  /**
   * 首次初始化默认应用（幂等）。
   * 仅当 bundle.settings.aiApplicationsSeededAt 不存在时写入种子数据，
   * 管理员删除全部应用后不会再次播种。
   *
   * @param {object} bundle workbenchV2 数据包
   * @param {{now?: string}} options
   * @returns {boolean} 是否发生了播种
   */
  function seedDefaultAiApplications(bundle, { now = nowIso() } = {}) {
    if (!bundle || typeof bundle !== 'object') return false;
    if (!bundle.settings || typeof bundle.settings !== 'object') bundle.settings = {};
    if (bundle.settings[SEED_FLAG_KEY]) return false;
    if (!Array.isArray(bundle.aiApplications)) bundle.aiApplications = [];
    SEED_APPLICATIONS.forEach(seed => {
      bundle.aiApplications.push(normalizeApplication(seed, { now }));
    });
    bundle.settings[SEED_FLAG_KEY] = now;
    return true;
  }

  return Object.freeze({
    STATUS_OPTIONS,
    STATUS_KEYS,
    DEFAULT_ICON,
    CATEGORY_ICONS,
    SEED_APPLICATIONS,
    SEED_FLAG_KEY,
    normalizeApplication,
    normalizeChangelog,
    validateApplicationForm,
    isValidUrl,
    normalizeStatus,
    statusLabel,
    resolveIcon,
    clampProgress,
    visibleApplications,
    sortApplications,
    computeStats,
    seedDefaultAiApplications,
  });
});
