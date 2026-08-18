(function () {
  function normalizeText(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function resumeEvaluation(resume) {
    return resume?.evaluation || 'pending';
  }

  function createSearchFilters({ reactive, computed, columns, debounceMs = 250 }) {
    const defaultFilters = {
      query: '',
      assignee: 'all',
      priority: 'all',
      resumeStatus: 'all',
      profileStatus: 'all',
      duplicateOnly: false,
      systemMatchOnly: false,
    };
    const searchFilters = reactive({ ...defaultFilters });
    const appliedFilters = reactive({ ...defaultFilters });
    const searchSubmitted = reactive({ value: false });

    function copyFilters(from, to) {
      Object.keys(defaultFilters).forEach(key => { to[key] = from[key]; });
    }

    function collectJobText(job, col) {
      const chunks = [col?.name, job?.company, job?.createdAt, job?.companyProfileText];
      (job?.positions || []).forEach(pos => {
        chunks.push(pos.name, pos.detail, pos.createdAt);
        (pos.resumes || []).forEach(resume => {
          chunks.push(
            resume.name,
            resume.note,
            resume.evaluationReason,
            resume.candidateSummary,
            resume.electronicResumeText,
            Array.isArray(resume.candidateKeywords) ? resume.candidateKeywords.join(' ') : ''
          );
        });
      });
      return normalizeText(chunks.filter(Boolean).join(' '));
    }

    function collectPositionText(pos) {
      return normalizeText([pos?.name, pos?.detail, pos?.createdAt].filter(Boolean).join(' '));
    }

    function collectResumeText(resume) {
      return normalizeText([
        resume?.name,
        resume?.note,
        resume?.evaluationReason,
        resume?.candidateSummary,
        resume?.candidateProfileText,
        resume?.electronicResumeText,
        Array.isArray(resume?.candidateKeywords) ? resume.candidateKeywords.join(' ') : '',
      ].filter(Boolean).join(' '));
    }

    function jobResumeStats(job) {
      const resumes = (job?.positions || []).flatMap(pos => pos.resumes || []);
      return {
        total: resumes.length,
        pending: resumes.filter(r => !r.evaluation || r.evaluation === 'pending').length,
        match: resumes.filter(r => r.evaluation === 'match').length,
        unmatch: resumes.filter(r => r.evaluation === 'unmatch').length,
        skip: resumes.filter(r => r.evaluation === 'skip').length,
        profileDone: resumes.filter(r => r.profileIndexStatus === 'done' && r.candidateSummary).length,
        profileFailed: resumes.filter(r => r.profileIndexStatus === 'failed').length,
        profileTodo: resumes.filter(r => !(r.profileIndexStatus === 'done' && r.candidateSummary)).length,
        duplicate: resumes.filter(r => Array.isArray(r.duplicateMatches) && r.duplicateMatches.length > 0).length,
      };
    }

    function jobHasActiveSystemMatch(job) {
      return (job?.positions || []).some(pos => {
        const dismissed = new Set(pos.dismissedCandidateKeys || []);
        const added = new Set(pos.addedCandidateKeys || []);
        return (pos.systemMatches || []).some(match =>
          !dismissed.has(match.candidateKey) && !added.has(match.candidateKey)
        );
      });
    }

    function matchesQuery(text, query) {
      const normalized = normalizeText(query);
      if (!normalized) return true;
      const haystack = normalizeText(text);
      return normalized.split(/\s+/).every(token => haystack.includes(token));
    }

    function resumeMatchesFilters(resume, filters) {
      const evalState = resumeEvaluation(resume);
      if (filters.resumeStatus === 'pending' && evalState !== 'pending') return false;
      if (filters.resumeStatus === 'match' && evalState !== 'match') return false;
      if (filters.resumeStatus === 'unmatch' && evalState !== 'unmatch') return false;
      if (filters.resumeStatus === 'skip' && evalState !== 'skip') return false;
      if (filters.profileStatus === 'done' && !(resume.profileIndexStatus === 'done' && resume.candidateSummary)) return false;
      if (filters.profileStatus === 'todo' && (resume.profileIndexStatus === 'done' && resume.candidateSummary)) return false;
      if (filters.profileStatus === 'failed' && resume.profileIndexStatus !== 'failed') return false;
      if (filters.duplicateOnly && !(Array.isArray(resume.duplicateMatches) && resume.duplicateMatches.length > 0)) return false;
      return true;
    }

    function jobMatches(job, col, colIdx, filters = appliedFilters) {
      if (filters.assignee !== 'all' && Number(filters.assignee) !== colIdx) return false;
      if (filters.priority !== 'all' && (job.priority || 'p2') !== filters.priority) return false;

      const stats = jobResumeStats(job);
      if (filters.resumeStatus === 'has' && stats.total === 0) return false;
      if (filters.resumeStatus === 'none' && stats.total > 0) return false;
      if (filters.resumeStatus === 'pending' && stats.pending === 0) return false;
      if (filters.resumeStatus === 'match' && stats.match === 0) return false;
      if (filters.resumeStatus === 'unmatch' && stats.unmatch === 0) return false;
      if (filters.resumeStatus === 'skip' && stats.skip === 0) return false;

      if (filters.profileStatus === 'done' && stats.profileDone === 0) return false;
      if (filters.profileStatus === 'todo' && stats.profileTodo === 0) return false;
      if (filters.profileStatus === 'failed' && stats.profileFailed === 0) return false;
      if (filters.duplicateOnly && stats.duplicate === 0) return false;
      if (filters.systemMatchOnly && !jobHasActiveSystemMatch(job)) return false;

      const query = normalizeText(filters.query);
      if (!query) return true;
      const haystack = collectJobText(job, col);
      return matchesQuery(haystack, query);
    }

    function filteredJobsByColumn(col, colIdx) {
      if (!searchActive.value) return col?.jobs || [];
      return (col?.jobs || []).filter(job => jobMatches(job, col, colIdx));
    }

    const searchActive = computed(() =>
      searchSubmitted.value && (
        !!appliedFilters.query.trim() ||
        appliedFilters.assignee !== 'all' ||
        appliedFilters.priority !== 'all' ||
        appliedFilters.resumeStatus !== 'all' ||
        appliedFilters.profileStatus !== 'all' ||
        appliedFilters.duplicateOnly ||
        appliedFilters.systemMatchOnly
      )
    );

    const searchDirty = computed(() =>
      Object.keys(defaultFilters).some(key => searchFilters[key] !== appliedFilters[key])
    );

    const searchResultStats = computed(() => {
      let jobs = 0;
      let resumes = 0;
      columns.forEach((col, colIdx) => {
        filteredJobsByColumn(col, colIdx).forEach(job => {
          jobs += 1;
          resumes += jobResumeStats(job).total;
        });
      });
      return { jobs, resumes };
    });

    const searchResults = computed(() => {
      if (!searchActive.value) return [];
      const results = [];
      const query = appliedFilters.query;
      if (!columns || !Array.isArray(columns)) return results;
      columns.forEach((col, colIdx) => {
        if (!col || !Array.isArray(col.jobs)) return;
        col.jobs.forEach(job => {
          if (!job || !jobMatches(job, col, colIdx)) return;

          const jobText = normalizeText([job.company, job.companyProfileText, job.createdAt].filter(Boolean).join(' '));
          if (matchesQuery(jobText, query)) {
            results.push({
              type: 'job',
              title: job.company || '未命名公司',
              subtitle: `${col.name} · ${job.positions?.length || 0} 个岗位`,
              snippet: job.companyProfileText || job.createdAt || '',
              colIdx,
              colName: col.name,
              job,
              pos: null,
              resume: null,
            });
          }

          if (!Array.isArray(job.positions)) return;
          job.positions.forEach(pos => {
            if (!pos) return;
            const posText = collectPositionText(pos);
            const resumes = pos.resumes || [];
            const positionPassesResumeState =
              ['all', 'has', 'none'].includes(appliedFilters.resumeStatus) ||
              resumes.some(resume => resumeMatchesFilters(resume, appliedFilters));
            if (positionPassesResumeState && matchesQuery(posText, query)) {
              results.push({
                type: 'position',
                title: pos.name || '未命名岗位',
                subtitle: `${job.company || '未命名公司'} · ${col.name}`,
                snippet: pos.detail || '',
                colIdx,
                colName: col.name,
                job,
                pos,
                resume: null,
              });
            }

            if (!Array.isArray(resumes)) return;
            resumes.forEach(resume => {
              if (!resume) return;
              if (!resumeMatchesFilters(resume, appliedFilters)) return;
              if (!matchesQuery(collectResumeText(resume), query)) return;
              const evalLabel = { pending: '待评判', match: '已匹配', unmatch: '不匹配', skip: '已跳过' }[resumeEvaluation(resume)] || '待评判';
              results.push({
                type: 'resume',
                title: resume.name || '未命名简历',
                subtitle: `${job.company || '未命名公司'} · ${pos.name || '未命名岗位'} · ${evalLabel}`,
                snippet: resume.candidateSummary || resume.evaluationReason || resume.note || resume.electronicResumeText || '',
                colIdx,
                colName: col.name,
                job,
                pos,
                resume,
              });
            });
          });
        });
      });
      return results.slice(0, 80);
    });

    function applySearchFilters() {
      copyFilters(searchFilters, appliedFilters);
      searchSubmitted.value = true;
    }

    let searchApplyTimer = null;
    function scheduleSearchApply() {
      if (searchApplyTimer) clearTimeout(searchApplyTimer);
      searchApplyTimer = setTimeout(() => {
        searchApplyTimer = null;
        applySearchFilters();
      }, Math.max(0, Number(debounceMs) || 0));
    }

    function resetSearchFilters() {
      if (searchApplyTimer) {
        clearTimeout(searchApplyTimer);
        searchApplyTimer = null;
      }
      copyFilters(defaultFilters, searchFilters);
      copyFilters(defaultFilters, appliedFilters);
      searchSubmitted.value = false;
    }

    return {
      searchFilters,
      searchActive,
      searchDirty,
      searchResultStats,
      searchResults,
      applySearchFilters,
      scheduleSearchApply,
      filteredJobsByColumn,
      resetSearchFilters,
      jobResumeStats,
    };
  }

  window.WorkBuddyFilters = { createSearchFilters };
})();
