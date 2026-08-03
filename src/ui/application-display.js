;(function initApplicationDisplay(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyApplicationDisplay = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createApplicationDisplay() {
  'use strict';

  function formatBeijingDateTime(value) {
    const time = Date.parse(String(value || ''));
    if (!Number.isFinite(time)) return String(value || '');
    const parts = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(time));
    const fields = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return `${fields.year}-${fields.month}-${fields.day} ${fields.hour}:${fields.minute}`;
  }

  function getApplicationStageStatus(application, stageSlaStatus) {
    if (!application) return { enteredAt: '', elapsedDays: 0, overdue: false, overdueDays: 0 };
    const enteredAt = [...(application.pipelineEvents || [])].reverse()
      .find(event => event.toStage === application.stage)?.occurredAt || application.updatedAt || '';
    return { ...stageSlaStatus({ pipelineStage: application.stage, pipelineStageEnteredAt: enteredAt }), enteredAt };
  }

  return Object.freeze({ formatBeijingDateTime, getApplicationStageStatus });
});
