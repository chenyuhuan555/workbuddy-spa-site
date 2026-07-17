// preview-gate.js
// 安全门禁：判定当前环境是否允许启用「离线预览」模式（绕过 Supabase 认证并注入本地 admin）。
//
// 背景：离线预览模式会跳过登录并注入 role='admin' 的访问对象，仅用于本地开发/沙箱预览。
// 若无门禁，任何生产/GitHub Pages 访客在认证未完成（含 Supabase 超时/失败/匿名未登录）时，
// 都会在超时后被自动提升为 admin，构成认证绕过。
//
// 放行条件（满足任意一条才允许预览模式）：
//   1. location.protocol === 'file:'                （本地文件直接打开）
//   2. hostname 为 localhost / 127.0.0.1 / ::1      （本地开发服务器）
//   3. 显式构建/测试标记 window.WORKBUDDY_PREVIEW_MODE === true
//
// 明确禁止：
//   - 不因 Supabase 连接失败、超时或未响应而放行。
//   - 不通过 URL 查询参数（如 ?preview=1 / ?admin=1）放行，避免进入正式构建后被利用。
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.WorkBuddyPreviewGate = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  var LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]'];

  // loc: 类 location 对象（含 protocol / hostname）；win: 类 window 对象（读取显式标记）。
  // 参数化以便在测试中注入不同环境；生产运行时不传参，默认取真实 location / window。
  function isPreviewEnvAllowed(loc, win) {
    try {
      loc = loc || (typeof location !== 'undefined' ? location : {});
      win = win || (typeof window !== 'undefined' ? window : {});
      var protocol = String(loc.protocol || '').toLowerCase();
      var hostname = String(loc.hostname || '').toLowerCase();

      // 条件 1：本地文件协议
      if (protocol === 'file:') return true;
      // 条件 2：本地开发主机
      if (LOCAL_HOSTS.indexOf(hostname) !== -1) return true;
      // 条件 3：显式的构建/测试标记（不来自 URL 参数）
      if (win.WORKBUDDY_PREVIEW_MODE === true) return true;

      return false;
    } catch (e) {
      // 任何异常都视为不放行，遵循默认拒绝原则
      return false;
    }
  }

  return { isPreviewEnvAllowed: isPreviewEnvAllowed, LOCAL_HOSTS: LOCAL_HOSTS.slice() };
});
