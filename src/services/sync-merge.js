/**
 * sync-merge.js — 多端同步记录级合并（纯函数，无副作用）
 *
 * 职责：
 *   - mergeCollectionById: 按 id 合并两个集合，updatedAt 较新者胜出
 *   - mergeWorkspaceStates: 合并本地与远端的完整工作区状态
 *
 * 加载方式：经典 <script> 标签，挂载到 window.WorkBuddySyncMerge
 * 后续迁移：改为 ES module export（Vite 打包阶段）
 *
 * @module services/sync-merge
 */
;(function (root) {
  'use strict';

  /**
   * 按 id 合并两个集合：双方独有记录保留，共有记录取 updatedAt 较新者。
   *
   * @param {Array<{id: string, updatedAt?: string}>} localArr  本地集合
   * @param {Array<{id: string, updatedAt?: string}>} remoteArr 远端集合
   * @returns {{ result: Array<object>, fromCloud: number }}
   *   result   — 合并后的完整数组
   *   fromCloud — 最终采用远端版本的记录数（用于 UI 提示）
   */
  function mergeCollectionById(localArr, remoteArr) {
    const map = new Map();
    let fromCloud = 0;
    (Array.isArray(remoteArr) ? remoteArr : []).forEach(item => {
      if (item?.id) map.set(item.id, { item, source: 'remote' });
    });
    (Array.isArray(localArr) ? localArr : []).forEach(item => {
      if (!item?.id) return;
      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, { item, source: 'local' });
      } else if (String(item.updatedAt || '') >= String(existing.item.updatedAt || '')) {
        map.set(item.id, { item, source: 'local' });
      }
    });
    const result = [];
    map.forEach(({ item, source }) => {
      if (source === 'remote') fromCloud++;
      result.push(item);
    });
    return { result, fromCloud };
  }

  /**
   * 合并本地与远端的完整工作区状态（记录级）。
   *
   * 合并策略：
   *   - workbenchV2 核心集合（companies/positions/candidates/applications/aiApplications）：按 id + updatedAt
   *   - kb（知识库文章）：按 id + updatedAt
   *   - deletedRecords：取远端（墓碑由 applyWorkspaceState 统一处理）
   *   - jobs（看板列）：本地为空时取远端
   *
   * @param {object} local  本地工作区快照
   * @param {object} remote 远端工作区快照
   * @returns {object} 合并后的工作区（深拷贝，不修改入参），附带 _mergeStats
   */
  function mergeWorkspaceStates(local, remote) {
    const merged = JSON.parse(JSON.stringify(local));
    let totalFromCloud = 0;
    // 合并 workbenchV2 核心集合（含 AI 应用中心）
    if (merged.workbenchV2 && remote?.workbenchV2) {
      ['companies', 'positions', 'candidates', 'applications', 'aiApplications'].forEach(key => {
        const { result, fromCloud } = mergeCollectionById(merged.workbenchV2[key], remote.workbenchV2[key]);
        merged.workbenchV2[key] = result;
        totalFromCloud += fromCloud;
      });
    } else if (!merged.workbenchV2 && remote?.workbenchV2) {
      merged.workbenchV2 = remote.workbenchV2;
      totalFromCloud += 1;
    }
    // 合并知识库（按 id）
    if (Array.isArray(remote?.kb) && remote.kb.length) {
      const { result, fromCloud } = mergeCollectionById(merged.kb, remote.kb);
      merged.kb = result;
      totalFromCloud += fromCloud;
    }
    // 合并删除墓碑
    if (remote?.deletedRecords) {
      merged.deletedRecords = remote.deletedRecords;
    }
    // 看板列：取远端（看板整体覆盖风险低，后续可细化）
    if (Array.isArray(remote?.jobs) && remote.jobs.some(col => Array.isArray(col) && col.length)) {
      if (!Array.isArray(merged.jobs) || !merged.jobs.some(col => Array.isArray(col) && col.length)) {
        merged.jobs = remote.jobs;
        merged.names = remote.names;
      }
    }
    merged._mergeStats = { fromCloud: totalFromCloud };
    return merged;
  }

  // ── 导出 ──
  root.WorkBuddySyncMerge = Object.freeze({
    mergeCollectionById,
    mergeWorkspaceStates,
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
