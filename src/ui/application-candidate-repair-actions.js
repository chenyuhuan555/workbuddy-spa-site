;(function initApplicationCandidateRepairActions(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyApplicationCandidateRepairActions = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createApplicationCandidateRepairActionsModule() {
  'use strict';

  function codeError(code, cause) {
    const error = new Error(code);
    error.code = code;
    error.cause = cause;
    return error;
  }

  function createApplicationCandidateRepairActions(options = {}) {
    const required = [
      'loadCandidates', 'loadApplications', 'upsertApplications',
      'downloadBackup', 'integrity', 'clone', 'now',
    ];
    if (required.some(key => !options[key])) throw codeError('INVALID_ARGUMENT');
    const state = options.state || {};
    Object.assign(state, {
      running: false,
      error: '',
      report: state.report || null,
      backupReady: false,
      backupRows: null,
      lastResult: null,
    });

    async function auditFresh() {
      const [candidates, applications] = await Promise.all([
        options.loadCandidates(),
        options.loadApplications(),
      ]);
      return {
        candidates,
        applications,
        report: options.integrity.audit({ candidates, applications }),
      };
    }

    async function audit() {
      state.running = true;
      state.error = '';
      try {
        const fresh = await auditFresh();
        state.report = fresh.report;
        state.backupReady = false;
        state.backupRows = {
          candidates: fresh.candidates.map(options.clone),
          applications: fresh.applications.map(options.clone),
        };
        state.lastResult = null;
        return state.report;
      } catch (error) {
        state.error = error?.message || 'AUDIT_FAILED';
        throw error;
      } finally {
        state.running = false;
      }
    }

    async function backup() {
      if (!state.report || !state.backupRows) throw codeError('AUDIT_REQUIRED');
      const payload = {
        exportedAt: options.now(),
        report: options.clone(state.report),
        candidates: state.backupRows.candidates.map(options.clone),
        applications: state.backupRows.applications.map(options.clone),
      };
      await options.downloadBackup(payload);
      state.backupReady = true;
      return payload;
    }

    async function apply() {
      if (!state.backupReady || !state.report) throw codeError('BACKUP_REQUIRED');
      state.running = true;
      state.error = '';
      const approvedFingerprint = state.report.fingerprint;
      try {
        const fresh = await auditFresh();
        if (fresh.report.fingerprint !== approvedFingerprint) throw codeError('STALE_PLAN');
        const patches = options.integrity.createPatches(fresh.applications, fresh.report.mappings);
        if (!patches.length) {
          const result = { updated: 0, unresolved: fresh.report.unresolved.length, report: fresh.report };
          state.lastResult = result;
          state.backupReady = false;
          return result;
        }

        const patchIds = new Set(patches.map(item => item.id));
        const originals = fresh.applications
          .filter(item => patchIds.has(item.id))
          .map(options.clone);
        const originalById = new Map(originals.map(item => [item.id, item]));
        if (patches.some(patch => !options.integrity.verifyPreserved(originalById.get(patch.id), patch))) {
          throw codeError('UNSAFE_PATCH');
        }

        await options.upsertApplications(patches);
        const verified = await auditFresh();
        const expectedOrphans = fresh.report.orphanApplicationIds.length - patches.length;
        if (verified.report.orphanApplicationIds.length !== expectedOrphans) {
          try {
            await options.upsertApplications(originals);
          } catch (rollbackError) {
            throw codeError('ROLLBACK_FAILED', rollbackError);
          }
          throw codeError('VERIFY_FAILED');
        }

        if (typeof options.replaceApplications === 'function') {
          options.replaceApplications(verified.applications.map(options.clone));
        }
        state.report = verified.report;
        state.backupReady = false;
        state.backupRows = null;
        const result = {
          updated: patches.length,
          unresolved: verified.report.unresolved.length,
          report: verified.report,
        };
        state.lastResult = result;
        return result;
      } catch (error) {
        state.error = error?.code || error?.message || 'REPAIR_FAILED';
        throw error;
      } finally {
        state.running = false;
      }
    }

    return Object.freeze({ state, audit, backup, apply });
  }

  return Object.freeze({ createApplicationCandidateRepairActions });
});
