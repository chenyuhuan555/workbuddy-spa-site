;(function initPipelineModule(root) {
  'use strict';
  root.WorkBuddyPipeline = (() => {
      /* 阶段 / 原因码统一来自 src/constants/pipeline-stages.js */
      const { KEYS, STAGES, REASONS } = root.WorkBuddyStages;

      function toIso(value, reference = Date.now()) {
        const text = String(value || '').trim();
        const legacy = text.match(/^(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/);
        const parsed = legacy
          ? new Date(new Date(reference).getFullYear(), Number(legacy[1]) - 1, Number(legacy[2]), Number(legacy[3] || 0), Number(legacy[4] || 0))
          : new Date(value || reference);
        if (!Number.isFinite(parsed.getTime())) throw new Error('发生时间无效');
        return parsed.toISOString();
      }

      function firstValidIso(values, fallback) {
        for (const value of values) {
          if (!value) continue;
          try { return toIso(value, fallback); } catch {}
        }
        return toIso(fallback);
      }

      function appendStageEvent(resume, input = {}) {
        if (!resume) throw new Error('候选人不存在');
        const toStage = String(input.toStage || '').trim();
        const reasonCode = String(input.reasonCode || '').trim();
        const reasonNote = String(input.reasonNote || '').trim();
        if (!STAGES.some(stage => stage.key === toStage)) throw new Error('无效推进阶段');
        if (reasonCode && !REASONS.some(reason => reason.key === reasonCode)) throw new Error('无效结果原因');
        if (toStage === KEYS.CLOSED && !reasonCode) throw new Error('终止阶段必须选择原因');
        if (reasonCode === 'other' && !reasonNote) throw new Error('其他原因必须填写说明');
        if (!Array.isArray(resume.pipelineEvents)) resume.pipelineEvents = [];
        const occurredAt = toIso(input.occurredAt);
        const event = {
          id: input.id || `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
          type: 'stage_changed',
          fromStage: resume.pipelineStage || '',
          toStage,
          reasonCode,
          reasonNote,
          occurredAt,
          actor: String(input.actor || '本机顾问'),
          estimated: !!input.estimated,
          source: String(input.source || 'manual'),
        };
        resume.pipelineEvents.push(event);
        resume.pipelineStage = toStage;
        resume.pipelineStageEnteredAt = occurredAt;
        resume.latestOutcomeReasonCode = reasonCode;
        resume.latestOutcomeReasonNote = reasonNote;
        return event;
      }

      function ensurePipelineData(resume, options = {}) {
        if (!resume) return false;
        let changed = false;
        if (!Array.isArray(resume.pipelineEvents)) {
          resume.pipelineEvents = [];
          changed = true;
        }
        if (!resume.pipelineStage) {
          resume.pipelineStage = KEYS.DISCOVERED;
          changed = true;
        }
        if (resume.pipelineEvents.length === 0) {
          appendStageEvent(resume, {
            toStage: resume.pipelineStage,
            occurredAt: firstValidIso([
              resume.lastFollowupAt,
              resume.evaluationUpdatedAt,
              resume.updatedAt,
              resume.uploadedAt,
            ], options.now || Date.now()),
            estimated: true,
            source: 'legacy_backfill',
          });
          changed = true;
        }
        const stringDefaults = {
          sourceType: '', sourceSite: '', sourceCampaign: '', startDate: '',
          probationReviewAt: '', probationResult: 'pending',
        };
        Object.entries(stringDefaults).forEach(([key, defaultValue]) => {
          if (typeof resume[key] !== 'string') {
            resume[key] = defaultValue;
            changed = true;
          }
        });
        return changed;
      }

      const DAY_MS = 24 * 60 * 60 * 1000;

      function stageSlaStatus(resume, now = Date.now()) {
        const stage = STAGES.find(item => item.key === resume?.pipelineStage);
        const slaDays = stage?.slaDays ?? null;
        if (!stage || slaDays === null) {
          return { slaDays, elapsedDays: 0, overdue: false, overdueDays: 0, invalid: !stage };
        }
        const enteredAt = Date.parse(String(resume?.pipelineStageEnteredAt || ''));
        const nowTime = new Date(now).getTime();
        if (!Number.isFinite(enteredAt) || !Number.isFinite(nowTime)) {
          return { slaDays, elapsedDays: 0, overdue: false, overdueDays: 0, invalid: true };
        }
        const elapsedMs = Math.max(0, nowTime - enteredAt);
        const elapsedDays = Math.floor(elapsedMs / DAY_MS);
        const overdueMs = elapsedMs - slaDays * DAY_MS;
        return {
          slaDays,
          elapsedDays,
          overdue: overdueMs > 0,
          overdueDays: overdueMs > 0 ? Math.ceil(overdueMs / DAY_MS) : 0,
          invalid: false,
        };
      }

      function median(values) {
        if (!values.length) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        const result = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
        return Math.round(result * 10) / 10;
      }

      function highestReachedIndex(resume) {
        const keys = (Array.isArray(resume?.pipelineEvents) ? resume.pipelineEvents : [])
          .map(event => event?.toStage)
          .concat(resume?.pipelineStage || '')
          .filter(key => key && key !== KEYS.CLOSED);
        return keys.reduce((max, key) => Math.max(max, STAGES.findIndex(stage => stage.key === key)), -1);
      }

      function buildFunnelMetrics(resumes = [], now = Date.now()) {
        const items = Array.isArray(resumes) ? resumes.filter(Boolean) : [];
        const nowTime = new Date(now).getTime();
        const durations = new Map(STAGES.map(stage => [stage.key, []]));
        items.forEach(resume => {
          const events = (Array.isArray(resume.pipelineEvents) ? resume.pipelineEvents : [])
            .filter(event => Number.isFinite(Date.parse(String(event?.occurredAt || ''))))
            .slice()
            .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
          events.forEach((event, index) => {
            if (!durations.has(event.toStage)) return;
            const start = Date.parse(event.occurredAt);
            const next = events[index + 1];
            const end = next ? Date.parse(next.occurredAt)
              : event.toStage === resume.pipelineStage && Number.isFinite(nowTime) ? nowTime : NaN;
            if (Number.isFinite(end) && end >= start) durations.get(event.toStage).push((end - start) / DAY_MS);
          });
        });

        const stages = STAGES.map((stage, index) => {
          const current = items.filter(resume => resume.pipelineStage === stage.key).length;
          const reached = stage.key === KEYS.CLOSED
            ? items.filter(resume => resume.pipelineStage === KEYS.CLOSED
              || (resume.pipelineEvents || []).some(event => event.toStage === KEYS.CLOSED)).length
            : items.filter(resume => highestReachedIndex(resume) >= index).length;
          const nextStage = STAGES[index + 1];
          const nextReached = !nextStage ? reached
            : nextStage.key === KEYS.CLOSED
              ? items.filter(resume => resume.pipelineStage === KEYS.CLOSED
                || (resume.pipelineEvents || []).some(event => event.toStage === KEYS.CLOSED)).length
              : items.filter(resume => highestReachedIndex(resume) >= index + 1).length;
          return {
            key: stage.key,
            label: stage.label,
            current,
            reached,
            conversionRate: reached ? Math.round(nextReached / reached * 100) : 0,
            medianDays: median(durations.get(stage.key) || []),
            overdue: items.filter(resume => resume.pipelineStage === stage.key && stageSlaStatus(resume, now).overdue).length,
          };
        });

        const milestoneIndexes = {
          recommended: STAGES.findIndex(stage => stage.key === KEYS.RECOMMENDED),
          clientAccepted: STAGES.findIndex(stage => stage.key === KEYS.CLIENT_ACCEPTED),
          interview: STAGES.findIndex(stage => stage.key === KEYS.INTERVIEW_PENDING),
          offer: STAGES.findIndex(stage => stage.key === KEYS.OFFER),
          onboarded: STAGES.findIndex(stage => stage.key === KEYS.ONBOARDED),
          regularized: STAGES.findIndex(stage => stage.key === KEYS.REGULARIZED),
        };
        const sourceMap = new Map();
        items.forEach(resume => {
          const source = String(resume.sourceSite || resume.sourceType || resume.uploaderName || resume.source || '未标记来源').trim() || '未标记来源';
          if (!sourceMap.has(source)) {
            sourceMap.set(source, { source, total: 0, recommended: 0, clientAccepted: 0, interview: 0, offer: 0, onboarded: 0, regularized: 0 });
          }
          const row = sourceMap.get(source);
          const maxIndex = highestReachedIndex(resume);
          row.total++;
          Object.entries(milestoneIndexes).forEach(([key, index]) => {
            if (maxIndex >= index) row[key]++;
          });
        });
        const sources = Array.from(sourceMap.values()).map(row => ({
          ...row,
          recommendedRate: row.total ? Math.round(row.recommended / row.total * 100) : 0,
          clientAcceptedRate: row.total ? Math.round(row.clientAccepted / row.total * 100) : 0,
          interviewRate: row.total ? Math.round(row.interview / row.total * 100) : 0,
          offerRate: row.total ? Math.round(row.offer / row.total * 100) : 0,
          onboardedRate: row.total ? Math.round(row.onboarded / row.total * 100) : 0,
          regularizedRate: row.total ? Math.round(row.regularized / row.total * 100) : 0,
        })).sort((a, b) => b.total - a.total);

        return { total: items.length, stages, sources };
      }

      function evaluationReasonCode(reason) {
        const text = String(reason || '');
        if (/薪资|预算|待遇/.test(text)) return 'compensation';
        if (/地点|城市|通勤|异地/.test(text)) return 'location';
        if (/客户|用人方/.test(text)) return 'client_rejected';
        if (/能力|经验|技能|背景|年限/.test(text)) return 'skill_gap';
        return 'other';
      }

      function syncEvaluationStage(resume, evaluation, reason = '', options = {}) {
        ensurePipelineData(resume, options);
        const common = {
          occurredAt: options.occurredAt,
          actor: options.actor,
          source: options.source || 'evaluation',
        };
        if (evaluation === 'match' && [KEYS.DISCOVERED, KEYS.CLOSED].includes(resume.pipelineStage)) {
          return appendStageEvent(resume, { ...common, toStage: KEYS.TO_RECOMMEND, reasonCode: 'qualified' });
        }
        if (evaluation === 'unmatch' && resume.pipelineStage !== KEYS.CLOSED) {
          const reasonNote = String(reason || '').trim() || '简历评判为不匹配，未填写具体原因';
          return appendStageEvent(resume, {
            ...common,
            toStage: KEYS.CLOSED,
            reasonCode: evaluationReasonCode(reasonNote),
            reasonNote,
          });
        }
        if (!evaluation && resume.pipelineStage !== KEYS.DISCOVERED) {
          return appendStageEvent(resume, { ...common, toStage: KEYS.DISCOVERED });
        }
        return null;
      }

      return {
        KEYS, STAGES, REASONS, appendStageEvent, ensurePipelineData,
        stageSlaStatus, buildFunnelMetrics, syncEvaluationStage,
      };
    })();
})(typeof globalThis !== 'undefined' ? globalThis : window);
