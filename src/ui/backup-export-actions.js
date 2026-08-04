export function createBackupExportActions({
  columns,
  kbArticles,
  cloneData,
  downloadJsonFile,
  backupDateLabel,
  sanitizeFileName,
  packFullBackup,
  showToast = () => {},
  now = () => new Date().toISOString(),
}) {
  function exportFullBackup() {
    downloadJsonFile(`WorkBuddy完整备份_${backupDateLabel()}.json`, packFullBackup());
    showToast('完整备份已导出');
  }

  function exportJobsBackup() {
    downloadJsonFile(`WorkBuddy岗位数据_${backupDateLabel()}.json`, {
      app: 'WorkBuddy', type: 'jobs', exportedAt: now(),
      columns: cloneData(columns).map(column => ({
        ...column,
        jobs: (column.jobs || []).map(job => ({
          ...job,
          positions: (job.positions || []).map(position => ({
            ...position,
            resumes: (position.resumes || []).map(resume => ({ ...resume, data: '' })),
          })),
        })),
      })),
    });
  }

  function exportSinglePositionBackup(job, position) {
    if (!job || !position) return;
    downloadJsonFile(`WorkBuddy岗位_${sanitizeFileName(job.company)}_${sanitizeFileName(position.name)}_${backupDateLabel()}.json`, {
      app: 'WorkBuddy', type: 'position', exportedAt: now(),
      company: cloneData({
        id: job.id, company: job.company, priority: job.priority || 'p2', createdAt: job.createdAt || '',
        companyProfileText: job.companyProfileText || '', companyProfileUpdatedAt: job.companyProfileUpdatedAt || '',
      }),
      position: cloneData(position),
    });
    showToast('岗位数据已导出');
  }

  function exportCandidatesBackup() {
    const candidates = [];
    columns.forEach((column, colIdx) => (column.jobs || []).forEach(job => (job.positions || []).forEach(position => (position.resumes || []).forEach(resume => {
      candidates.push({ assignee: column.name, colIdx, company: job.company, jobId: job.id, position: position.name, posId: position.id, resume: cloneData(resume) });
    }))));
    downloadJsonFile(`WorkBuddy候选人库_${backupDateLabel()}.json`, { app: 'WorkBuddy', type: 'candidates', exportedAt: now(), candidates });
  }

  function exportKbBackup() {
    downloadJsonFile(`WorkBuddy知识库_${backupDateLabel()}.json`, {
      app: 'WorkBuddy', type: 'knowledge-base', exportedAt: now(), kbArticles: cloneData(kbArticles),
    });
  }

  return { exportFullBackup, exportJobsBackup, exportSinglePositionBackup, exportCandidatesBackup, exportKbBackup };
}

if (typeof window !== 'undefined') window.WorkBuddyBackupExportActions = { createBackupExportActions };
