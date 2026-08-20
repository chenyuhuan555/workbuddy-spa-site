import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const INDEX_HTML = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const PACKAGE_JSON = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

test('loads the talent library adapter and aliases it inside Vue setup', () => {
  assert.match(
    INDEX_HTML,
    /workbench-owners\.js\?v=20260803-workbenchowners1"><\/script>\s*<script src="\.\/src\/ui\/talent-library-table\.js\?v=20260813-talenttable1"><\/script>/,
  );
  assert.match(INDEX_HTML, /const TalentLibrary = window\.WorkBuddyTalentLibraryTable;/);
});

test('derives filtered talent rows from visible Applications without writing workflow state to Candidates', () => {
  assert.match(INDEX_HTML, /const candidateSourceRows = computed\(\(\) => WorkbenchV2\.filterCandidatesByCategory\([\s\S]*?query:\s*''[\s\S]*?candidateFilters\.category[\s\S]*?\)\);/);
  assert.match(INDEX_HTML, /TalentLibrary\.buildRows\(\{[\s\S]*?candidates:\s*candidateSourceRows\.value(?:\.filter\([\s\S]*?\))?,[\s\S]*?applications:\s*visibleApplications\.value,[\s\S]*?positions:\s*workbenchV2\.positions,[\s\S]*?companies:\s*workbenchV2\.companies,[\s\S]*?stageLabel:\s*candidatePipelineLabel,[\s\S]*?\}\)/);
  assert.match(INDEX_HTML, /TalentLibrary\.filterRows\(talentLibraryRows\.value,\s*\{[\s\S]*?query:\s*candidateFilters\.query,[\s\S]*?owner:\s*candidateFilters\.owner,[\s\S]*?status:\s*candidateFilters\.status[\s\S]*?\}\)/);
  assert.doesNotMatch(INDEX_HTML, /candidate\.(?:stage|pipelineStage)\s*=(?!=)/);
});

test('defines talent filters and column preferences and exposes the talent library bindings', () => {
  assert.match(INDEX_HTML, /const talentLibraryFilters = reactive\(\{[\s\S]*?base:\s*'',\s*positionId:\s*'all',\s*stage:\s*'all',\s*education:\s*'',[\s\S]*?intake:\s*\{\s*preset:\s*'all',\s*from:\s*'',\s*to:\s*''\s*\},[\s\S]*?touch:\s*\{\s*preset:\s*'all',\s*from:\s*'',\s*to:\s*''\s*\},[\s\S]*?recommendation:\s*\{\s*preset:\s*'all',\s*from:\s*'',\s*to:\s*''\s*\},[\s\S]*?\}\);/);
  assert.match(INDEX_HTML, /const talentLibraryColumnKeys\s*=\s*ref\(TalentLibrary\.loadColumnKeys\(window\.localStorage\)\);/);
  assert.match(INDEX_HTML, /return \{[\s\S]*?TalentLibrary,[\s\S]*?talentLibraryFilters,\s*talentLibraryColumnKeys,\s*talentLibraryColumns,/);
});

test('includes the adapter and Vue wiring tests in the package test script', () => {
  assert.match(
    PACKAGE_JSON.scripts.test,
    /src\/ui\/list-performance\.test\.mjs src\/ui\/talent-library-table\.test\.mjs src\/ui\/talent-library-ui\.test\.mjs/,
  );
});

test('renders one unified talent search and compact inline summary inside the list boundary', () => {
  const listBlock = INDEX_HTML.match(/<div data-talent-library-list[\s\S]*?<span data-talent-library-list-end hidden><\/span>/)?.[0] || '';

  assert.ok(listBlock, 'talent library list boundary should exist');
  assert.equal((listBlock.match(/v-model="candidateFilters\.query"/g) || []).length, 1);
  assert.match(listBlock, /当前结果[\s\S]*?talentLibrarySummary\.total[\s\S]*?本周入库[\s\S]*?talentLibrarySummary\.weekIntake[\s\S]*?本周已触达[\s\S]*?talentLibrarySummary\.weekTouched/);
  assert.doesNotMatch(listBlock, /人才总数[\s\S]*?当前推进中[\s\S]*?可看机会[\s\S]*?已入职/);
  assert.doesNotMatch(listBlock, /云端全文搜索结果/);
});

test('人才库视觉精简保留完整默认列并允许桌面横向滚动', () => {
  const listBlock = INDEX_HTML.match(/<div data-talent-library-list[\s\S]*?<span data-talent-library-list-end hidden><\/span>/)?.[0] || '';

  assert.match(INDEX_HTML, /min-width:\s*1900px/);
  assert.match(INDEX_HTML, /\.wb-talent-table-shell\s*\{[\s\S]*?overflow:\s*auto/);
  for (const label of ['当前公司 \/ 当前岗位', '当前 Base', '期望 Base', '当前薪酬', '期望薪酬', '最近触达', '入库日期']) {
    assert.match(listBlock, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-talent-table\s+td\s*\{[\s\S]*?font-size:\s*15px/);
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-talent-table\s+td\s*\{[\s\S]*?height:\s*62px/);
  assert.match(INDEX_HTML, /\.wb-talent-table-name-cell\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?left:\s*0/);
});

test('人才库工具栏和筛选区使用精简视觉结构', () => {
  const listBlock = INDEX_HTML.match(/<div data-talent-library-list[\s\S]*?<span data-talent-library-list-end hidden><\/span>/)?.[0] || '';

  assert.match(listBlock, /data-talent-library-toolbar/);
  assert.match(listBlock, /data-talent-library-filter-chips/);
  assert.match(listBlock, /<svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current"[\s\S]*?<span>筛选<\/span>/);
  assert.match(listBlock, /人才库专属搜索/);
  assert.match(INDEX_HTML, /\.wb-talent-library-page\s*\{[\s\S]*?background:\s*#fff/);
  assert.doesNotMatch(listBlock, /rounded-xl border border-slate-200 bg-white p-3/);
});

test('自定义列按钮使用 SVG 下箭头而不是文字 v', () => {
  const button = INDEX_HTML.match(/自定义列[\s\S]*?<\/button>/)?.[0] || '';
  assert.match(button, /<svg[\s\S]*?d="m6 9 6 6 6-6"/);
  assert.doesNotMatch(button, />\s*[v⌄]\s*</);
});

test('人才表格行悬停不使用绿色背景', () => {
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-talent-table tbody tr:hover\s*\{\s*background:\s*#f8fafc/);
  assert.doesNotMatch(INDEX_HTML, /\.wb-v2-workspace \.wb-talent-table tbody tr:hover\s*\{\s*background:\s*#f0fdf8/);
});

test('人才库采用浅灰页面底色和三层白色内容区域', () => {
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-talent-library-page\s*\{\s*background:\s*#f7f8fa/);
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-talent-filter-toolbar\s*\{[\s\S]*?background:\s*#fff[\s\S]*?border-radius:\s*12px/);
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-talent-table-shell\s*\{[\s\S]*?box-shadow:\s*0 2px 8px rgba\(15, 23, 42, 0\.04\)/);
});

test('人才库标题卡片上方不保留重复空白层', () => {
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-v2-main:has\(\[data-talent-library-list\]\)\s*\{\s*padding:\s*16px 28px 28px/);
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-talent-library-page\s*\{[\s\S]*?padding:\s*18px 24px 32px/);
});

test('人才库保留顶部间距并让表格底部保持圆角', () => {
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-v2-main:has\(\[data-talent-library-list\]\)\s*\{\s*padding:\s*16px 28px 28px/);
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-talent-table-shell\s*\{[\s\S]*?border-bottom-left-radius:\s*12px[\s\S]*?border-bottom-right-radius:\s*12px/);
});

test('人才库使用左侧导航后的全宽工作区而不是居中 max-width 容器', () => {
  const workspace = INDEX_HTML.match(/<div v-if="workbenchRoute\.type === 'list' \|\| candidateDetailMode === 'drawer'[\s\S]*?<div data-talent-library-list/)?.[0] || '';

  assert.match(workspace, /class="[^"]*wb-talent-library-workspace[^"]*w-full[^"]*max-w-none[^"]*"/);
  assert.doesNotMatch(workspace, /max-w-7xl\s+mx-auto/);
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-v2-main:has\(\[data-talent-library-list\]\)[\s\S]*?padding:\s*16px 28px 28px/);
});

test('人才库表格保留横向滚动并使用纯白工作区背景', () => {
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-talent-table-shell\s*\{[\s\S]*?overflow-x:\s*auto/);
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-talent-library-page\s*\{\s*background:\s*#f7f8fa/);
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-talent-table\s*\{[\s\S]*?min-width:\s*1900px/);
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-talent-table th\s*\{[\s\S]*?white-space:\s*nowrap/);
});

test('合作公司指标卡与其他指标卡共享统一排版样式', () => {
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-v2-metric-grid\s*> div,\s*\.wb-v2-workspace \.wb-v2-metric-grid\s*> button/);
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-v2-metric-grid\s*> button\s*> div:first-child/);
});

test('合作公司指标卡保留现有导航入口且不引入示例业务数据', () => {
  assert.match(INDEX_HTML, /aria-label="查看合作公司列表"[\s\S]*?workbenchDashboardMetrics\.companies/);
  assert.doesNotMatch(INDEX_HTML, /合作公司[\s\S]*?(30万|2026-07-28|林晓)/);
});

test('人才库隐藏重复的工作台顶部栏并在唯一标题旁显示人数', () => {
  assert.match(INDEX_HTML, /class="wb-v2-topbar[^\"]*"[^>]*:class="\{\s*'wb-v2-topbar--talent-hidden': workbenchNav === 'candidates'\s*\}"/);
  assert.match(INDEX_HTML, /\.wb-v2-topbar\.wb-v2-topbar--talent-hidden\s*\{\s*display:\s*none\s*!important;/);
  assert.match(INDEX_HTML, /<h1[^>]*>人才库<\/h1>\s*<span[^>]*>\{\{ talentLibrarySummary\.total \}\} 人<\/span>/);
});

test('网页背景移除图片和渐变并使用纯白底色', () => {
  assert.match(INDEX_HTML, /html\s*\{\s*background:\s*#fff\s*!important;/);
  assert.match(INDEX_HTML, /body\s*\{\s*min-height:\s*100vh;\s*background:\s*#fff\s*!important;/);
  assert.match(INDEX_HTML, /\.wb-v2-workspace\s*\{[\s\S]*?background:\s*#fff\s*!important;/);
  assert.doesNotMatch(INDEX_HTML, /linear-gradient\(90deg, rgba\(244,248,244,0\.32\), rgba\(244,248,244,0\.16\)\),\s*url\("\.\/src\/assets\/headhunter-bg\.png"\)/);
  assert.doesNotMatch(INDEX_HTML, /background:\s*#f7f9f8\s+url\('\.\/src\/assets\/workbench-v2-bg\.png'\)/);
});

test('renders distinct education and candidate asset status filters in the compact filter bar', () => {
  const listBlock = INDEX_HTML.match(/<div data-talent-library-list[\s\S]*?<span data-talent-library-list-end hidden><\/span>/)?.[0] || '';

  assert.match(listBlock, /<input[^>]*aria-label="按学历筛选人才"[^>]*v-model="talentLibraryFilters\.education"[^>]*placeholder="学历"/);
  assert.match(listBlock, /<select[^>]*aria-label="按人才求职状态筛选"[^>]*v-model="candidateFilters\.status"[\s\S]*?<option value="all">全部求职状态<\/option>[\s\S]*?<option value="open">可看机会<\/option>[\s\S]*?<option value="passive">被动看机会<\/option>[\s\S]*?<option value="paused">暂不考虑<\/option>[\s\S]*?<option value="onboarded">已入职<\/option>[\s\S]*?<\/select>/);
  assert.match(listBlock, /<select[^>]*aria-label="按当前流程筛选人才"[^>]*v-model="talentLibraryFilters\.stage"/);
});

test('renders one fallback when both current company and title are missing', () => {
  const listBlock = INDEX_HTML.match(/<div data-talent-library-list[\s\S]*?<span data-talent-library-list-end hidden><\/span>/)?.[0] || '';

  assert.match(listBlock, /v-if="!candidate\.currentCompany && !candidate\.currentTitle"[^>]*>公司 \/ 岗位待补充<\/span>/);
  assert.match(listBlock, /v-else[\s\S]*?candidate\.currentCompany \|\| '-'[\s\S]*?candidate\.currentTitle \|\| '-'/);
});

test('renders the configurable dense talent table with sticky and clamped cells', () => {
  assert.match(INDEX_HTML, /\.wb-talent-table-name-cell\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?left:\s*0;/);
  assert.match(INDEX_HTML, /\.wb-talent-cell-clamp\s*\{[\s\S]*?-webkit-line-clamp:\s*2;/);
  assert.match(INDEX_HTML, /v-if="talentLibraryColumnSet\.has\('expectedSalary'\)"[\s\S]*?candidate\.expectedSalary/);
  assert.match(INDEX_HTML, /candidate\.primaryFlow/);
  assert.match(INDEX_HTML, /candidate\.extraFlowCount/);
});

test('renders custom column controls, selection, and accessible row actions', () => {
  assert.match(INDEX_HTML, /v-for="column in TalentLibrary\.COLUMN_DEFINITIONS"[\s\S]*?:disabled="column\.locked"[\s\S]*?:checked="talentLibraryColumnSet\.has\(column\.key\)"[\s\S]*?setTalentLibraryColumn\(column\.key,\s*\$event\.target\.checked\)/);
  assert.match(INDEX_HTML, /@change="toggleCandidateSelection\(candidate\.id,\s*\$event\.target\.checked\)"/);
  assert.match(INDEX_HTML, /candidateRowMenuId\s*===\s*candidate\.id\s*\?\s*''\s*:\s*candidate\.id/);
  assert.match(INDEX_HTML, /aria-label="候选人操作"[\s\S]*?>\s*···\s*<\/button>/);
  assert.match(INDEX_HTML, /function selectCandidateDetail\(id,\s*tab\)[\s\S]*?Object\.assign\(workbenchRoute,[\s\S]*?tab\s*\}\);/);
  assert.match(INDEX_HTML, /function openCandidateDetail\(id,\s*tab\s*=\s*'resume'\)[\s\S]*?selectCandidateDetail\(id,\s*tab\);/);
});

test('keeps cloud search status results and paging reachable inside the compact list', () => {
  const listBlock = INDEX_HTML.match(/<div data-talent-library-list[\s\S]*?<span data-talent-library-list-end hidden><\/span>/)?.[0] || '';

  assert.match(listBlock, /talentCloudSearch\.running/);
  assert.match(listBlock, /talentCloudSearch\.error/);
  assert.match(listBlock, /v-for="item in talentCloudSearch\.items"/);
  assert.match(listBlock, /openCandidateDetail\(item\.candidate_id\)/);
  assert.match(listBlock, /changeTalentCloudSearchPage\(talentCloudSearch\.page - 1\)[\s\S]*?changeTalentCloudSearchPage\(talentCloudSearch\.page \+ 1\)/);
  assert.doesNotMatch(listBlock, /云端全文搜索结果/);
});

test('keeps prior talent list operations in a compact closable actions menu', () => {
  const listBlock = INDEX_HTML.match(/<div data-talent-library-list[\s\S]*?<span data-talent-library-list-end hidden><\/span>/)?.[0] || '';

  assert.match(listBlock, /分类管理/);
  assert.match(listBlock, /talentLibraryActionsOpen = false; openTalentCategoryManager\(\)[\s\S]*?>分类管理</);
  assert.match(listBlock, /talentLibraryActionsOpen = false; openTalentJobMatch\(\)[\s\S]*?>岗位匹配</);
  assert.match(listBlock, /v-if="canConfigureAi"[\s\S]*?talentLibraryActionsOpen = false; openTalentCompanyResearch\(\)[\s\S]*?>目标公司挖掘</);
  assert.match(listBlock, /v-if="canWrite && canConfigureAi"[\s\S]*?talentLibraryActionsOpen = false; runCandidateSmartOrganize\(\)[\s\S]*?AI填写信息/);
  assert.match(INDEX_HTML, /const talentLibraryActionsOpen\s*=\s*ref\(false\);/);
  assert.match(INDEX_HTML, /return \{[\s\S]*?talentLibraryActionsOpen,/);
});

test('one candidate detail tree supports drawer and full-page modes', () => {
  assert.match(INDEX_HTML, /const candidateDetailMode\s*=\s*ref\('full'\);/);
  assert.match(INDEX_HTML, /function openCandidateDrawer\(id,\s*tab\s*=\s*'resume'\)\s*\{[\s\S]*?candidateDetailMode\.value\s*=\s*'drawer';[\s\S]*?selectCandidateDetail\(id,\s*tab\);[\s\S]*?\}/);
  assert.match(INDEX_HTML, /:class="\[[^\]]*?'wb-candidate-drawer':\s*candidateDetailMode\s*===\s*'drawer'/);
  assert.equal((INDEX_HTML.match(/aria-label="候选人详情页签"/g) || []).length, 1);
});

test('candidate drawer defaults to resume and keeps full-page matching available', () => {
  const tabSets = INDEX_HTML.match(/const candidateDetailTabs\s*=\s*computed\(\(\)\s*=>\s*candidateDetailMode\.value\s*===\s*'drawer'\s*\?\s*\[([\s\S]*?)\]\s*:\s*\[([\s\S]*?)\]\);/);
  assert.ok(tabSets, 'drawer and full-page tab sets should be defined together');
  assert.equal((tabSets[1].match(/\{\s*id:/g) || []).length, 6);
  assert.equal((tabSets[2].match(/\{\s*id:/g) || []).length, 7);
  assert.match(tabSets[1], /resume[\s\S]*?原始简历[\s\S]*?overview[\s\S]*?结构化信息[\s\S]*?applications[\s\S]*?推荐记录[\s\S]*?interviews[\s\S]*?面试进度[\s\S]*?activity[\s\S]*?跟进记录[\s\S]*?ai[\s\S]*?AI分析/);
  assert.match(tabSets[2], /resume[\s\S]*?原始简历[\s\S]*?overview[\s\S]*?结构化信息[\s\S]*?matching[\s\S]*?岗位匹配[\s\S]*?applications[\s\S]*?推荐记录[\s\S]*?interviews[\s\S]*?面试进度[\s\S]*?ai[\s\S]*?AI分析[\s\S]*?activity[\s\S]*?跟进记录/);
  const listBlock = INDEX_HTML.match(/<div data-talent-library-list[\s\S]*?<span data-talent-library-list-end hidden><\/span>/)?.[0] || '';
  assert.match(listBlock, /@click="openCandidateDrawer\(candidate\.id\)"[\s\S]*?\{\{ candidate\.name \|\| '-' \}\}/);
  assert.match(listBlock, /@click="candidateRowMenuId = ''; openCandidateDrawer\(candidate\.id,\s*'overview'\)"[^>]*>查看详情<\/button>/);
  assert.match(listBlock, /@click="candidateRowMenuId = ''; openCandidateDrawer\(candidate\.id,\s*'overview'\)"[^>]*>编辑<\/button>/);
  assert.match(listBlock, /@click="openCandidateDrawer\(candidate\.id,\s*'applications'\)"/);
  assert.match(INDEX_HTML, /@click="openCandidateDetail\(selectedCandidate\.id,\s*workbenchRoute\.tab\)"/);
  assert.match(INDEX_HTML, /const selectedCandidateInterviewApplications\s*=\s*computed\(\(\)\s*=>\s*selectedCandidateApplications\.value\.filter\(item\s*=>\s*SG\.INTERVIEW\.includes\(item\.stage\)\)\);/);
  assert.match(INDEX_HTML, /workbenchRoute\.tab\s*===\s*'interviews'[\s\S]*?selectedCandidateInterviewApplications[\s\S]*?openApplicationDetail\(application\.id\)/);
});

test('candidate drawer closes on Escape without replacing resume loading or file actions', () => {
  const escapeHandler = INDEX_HTML.match(/@keydown\.esc\.window="([^"]*closeCandidateDrawer[^"]*)"/)?.[1] || '';
  assert.ok(escapeHandler, 'candidate drawer close should be wired to window Escape');
  assert.match(escapeHandler, /talentLibraryColumnsOpen = false/);
  assert.match(escapeHandler, /candidateRowMenuId = ''/);
  assert.match(escapeHandler, /talentLibraryActionsOpen = false/);
  assert.match(INDEX_HTML, /void ensureResumeTexts\(activeCandidateResumeVersion\.value\);/);
  assert.match(INDEX_HTML, /candidate-original-file-actions\.js/);
});

test('candidate drawer close guards active core and resume drafts before resetting the route', () => {
  const closeStart = INDEX_HTML.indexOf('function closeCandidateDrawer()');
  const closeEnd = INDEX_HTML.indexOf('function openApplicationDetail', closeStart);
  const closeBlock = INDEX_HTML.slice(closeStart, closeEnd);
  assert.match(closeBlock, /candidateCoreEdit\.active/);
  assert.match(closeBlock, /candidateResumeEdit\.active/);
  const confirmIndex = closeBlock.indexOf('confirm(');
  const routeResetIndex = closeBlock.indexOf("Object.assign(workbenchRoute, { type: 'list'");
  assert.ok(confirmIndex >= 0, 'closing with an active draft should ask for confirmation');
  assert.ok(routeResetIndex > confirmIndex, 'confirmation must happen before the route reset');
  assert.match(closeBlock, /if\s*\([^)]*!confirm\([\s\S]*?\)\)\s*return false;/);
});

test('candidate drawer keeps the talent list visible as a non-modal context panel', () => {
  const listWrapper = INDEX_HTML.match(/<div v-if="workbenchRoute\.type === 'list' \|\| candidateDetailMode === 'drawer'"[^>]*>/)?.[0] || '';
  assert.doesNotMatch(listWrapper, /:inert="candidateDrawerOpen"/);
  assert.doesNotMatch(listWrapper, /:aria-hidden="candidateDrawerOpen/);
  const detailWrapper = INDEX_HTML.match(/<div v-if="workbenchRoute\.type === 'candidate' && selectedCandidate"[^>]*>/)?.[0] || '';
  assert.doesNotMatch(detailWrapper, /:role="candidateDrawerOpen \? 'dialog'/);
  assert.doesNotMatch(detailWrapper, /:aria-modal="candidateDrawerOpen \? 'true'/);
  assert.match(INDEX_HTML, /watch\(candidateDrawerOpen,[\s\S]*?document\.body\.classList\.toggle\('wb-candidate-drawer-open',\s*isOpen\)/);
  assert.match(INDEX_HTML, /onBeforeUnmount\(\(\)\s*=>\s*\{[\s\S]*?document\.body\.classList\.remove\('wb-candidate-drawer-open'\)/);
  assert.match(INDEX_HTML, /body\.wb-candidate-drawer-open\s*\{\s*overflow:\s*visible;/);
  assert.doesNotMatch(INDEX_HTML, /fixed inset-0 z-40 bg-slate-950\/30/);
});

test('candidate drawer manages initial focus, traps Tab, and restores its trigger', () => {
  assert.match(INDEX_HTML, /ref="candidateDrawerElement"/);
  assert.match(INDEX_HTML, /ref="candidateDrawerCloseButton"/);
  assert.match(INDEX_HTML, /@keydown\.tab="trapCandidateDrawerFocus"/);
  assert.match(INDEX_HTML, /function openCandidateDrawer\(id,\s*tab\s*=\s*'resume'\)[\s\S]*?candidateDrawerTriggerElement\s*=\s*document\.activeElement[\s\S]*?nextTick\(focusCandidateDrawer\)/);
  assert.match(INDEX_HTML, /function focusCandidateDrawer\(\)[\s\S]*?candidateDrawerCloseButton\.value\?\.focus\(\)[\s\S]*?candidateDrawerElement\.value\?\.focus\(\)/);
  assert.match(INDEX_HTML, /function trapCandidateDrawerFocus\(event\)[\s\S]*?event\.shiftKey[\s\S]*?event\.preventDefault\(\)[\s\S]*?\.focus\(\)/);
  assert.match(INDEX_HTML, /candidateDrawerTriggerElement\?\.isConnected[\s\S]*?candidateDrawerTriggerElement\.focus\(\)/);
});

test('candidate drawer uses a softer panel surface and lightweight top actions', () => {
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-candidate-drawer\s*\{[\s\S]*?top:\s*16px[\s\S]*?right:\s*16px[\s\S]*?width:\s*min\(860px[\s\S]*?border-radius:\s*24px[\s\S]*?box-shadow:\s*0 24px 70px/);
  assert.match(INDEX_HTML, /class="wb-candidate-drawer-actions flex items-center justify-end gap-2"/);
  assert.match(INDEX_HTML, /class="wb-candidate-drawer-open-full rounded-lg px-3 py-2"/);
  assert.doesNotMatch(INDEX_HTML, /wb-candidate-drawer-more|更多候选人操作/);
  assert.match(INDEX_HTML, /class="wb-candidate-drawer-close inline-flex h-9 w-9 items-center justify-center rounded-full border/);
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-v2-candidate-tabs\s*\{[\s\S]*?margin-top:\s*24px[\s\S]*?border-bottom:\s*1px solid #edf1ef/);
});

test('候选人简历操作与视图切换位于同一工具栏行', () => {
  const resumeBlock = INDEX_HTML.match(/<div v-else-if="workbenchRoute\.tab === 'resume'"[\s\S]*?<div class="border-t border-slate-200 bg-white px-4 pt-3 pb-5">/)?.[0] || '';
  assert.ok(resumeBlock, 'resume content block should exist');
  assert.match(resumeBlock, /class="resume-toolbar[^\"]*px-4 py-0/);
  assert.match(resumeBlock, /class="resume-toolbar-actions[^\"]*"/);
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.resume-toolbar-actions\s*\{[^}]*margin-left:\s*auto/);
  assert.match(resumeBlock, /编辑简历/);
  assert.doesNotMatch(resumeBlock, /<h2[^>]*>简历<\/h2>/);
  assert.match(resumeBlock, /class="[^\"]*h-8[^\"]*rounded-md[^\"]*border-emerald-700[^\"]*bg-transparent/);
  assert.match(resumeBlock, /重新处理[\s\S]*?<svg[\s\S]*?d="m6 9 6 6 6-6"/);
  // 电子简历/原始文件视图切换与编辑简历、重新处理操作位于同一工具栏行（不再分成两层）
  assert.doesNotMatch(resumeBlock, /class="candidate-resume-view-tabs[^\"]*mt-4/);
  assert.match(resumeBlock, /class="resume-toolbar-actions[^"]*"[\s\S]*?class="candidate-resume-view-tabs/);
  assert.doesNotMatch(resumeBlock, /电子简历[\s\S]*?<span aria-hidden="true">/);
  assert.match(resumeBlock, /candidateResumeView\.mode === 'text'[\s\S]*?rounded-md border[\s\S]*?电子简历/);
  assert.match(resumeBlock, /candidateResumeView\.mode === 'original'[\s\S]*?rounded-md border[\s\S]*?原始文件/);
  assert.doesNotMatch(resumeBlock, /candidateResumeView\.mode === '[^']+'[\s\S]*?border-b-2/);
  assert.doesNotMatch(resumeBlock, /inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm/);
});

test('岗位匹配使用轻量列表层级而不是大卡片装饰', () => {
  const matchingBlock = INDEX_HTML.match(/<div v-else-if="workbenchRoute\.tab === 'matching'"[\s\S]*?<div v-else-if="workbenchRoute\.tab === 'ai'"/)?.[0] || '';
  assert.ok(matchingBlock, 'matching content block should exist');
  assert.match(matchingBlock, /class="candidate-matching-panel[^\"]*pt-6/);
  assert.match(matchingBlock, /<h2[^>]*>岗位匹配<\/h2>/);
  assert.doesNotMatch(matchingBlock, /aria-hidden="true">▣<\/span>/);
  assert.match(matchingBlock, /class="candidate-matching-list[^\"]*divide-y/);
  assert.match(matchingBlock, /class="candidate-matching-row[^\"]*py-4/);
  assert.match(matchingBlock, /\.slice\(0,\s*3\)/);
  assert.match(matchingBlock, /\+\{\{[\s\S]*?\.length - 3/);
  assert.match(matchingBlock, /match\.score >= 70/);
  assert.match(matchingBlock, /class="[^\"]*h-9[^\"]*rounded-lg[^\"]*border-emerald-700/);
  assert.doesNotMatch(matchingBlock, /text-4xl font-bold/);
  assert.doesNotMatch(matchingBlock, /rounded-2xl border border-slate-100 bg-white p-5 shadow-sm/);
});

test('候选人详情作为非模态并排面板保留人才列表可见可操作', () => {
  const listWrapper = INDEX_HTML.match(/<div v-if="workbenchRoute\.type === 'list' \|\| candidateDetailMode === 'drawer'"[^>]*>/)?.[0] || '';
  assert.doesNotMatch(listWrapper, /:inert="candidateDrawerOpen"/);
  assert.doesNotMatch(listWrapper, /:aria-hidden="candidateDrawerOpen/);
  const detailWrapper = INDEX_HTML.match(/<div v-if="workbenchRoute\.type === 'candidate' && selectedCandidate"[^>]*>/)?.[0] || '';
  assert.match(detailWrapper, /:class="\[[^\]]*'wb-candidate-drawer': candidateDetailMode === 'drawer'/);
  assert.doesNotMatch(detailWrapper, /:role="candidateDrawerOpen \? 'dialog'/);
  assert.doesNotMatch(detailWrapper, /:aria-modal="candidateDrawerOpen \? 'true'/);
  assert.match(INDEX_HTML, /body\.wb-candidate-drawer-open\s*\{\s*overflow:\s*visible;/);
});

test('AI工具箱和知识库复用推进中心的轻量工作区表面', () => {
  assert.match(INDEX_HTML, /workbenchNav === 'ai' && workbenchRoute\.type === 'list'" class="wb-toolbox-page max-w-7xl mx-auto space-y-4/);
  assert.match(INDEX_HTML, /class="wb-toolbox-card bg-white rounded-xl border border-slate-200 overflow-hidden"/);
  assert.match(INDEX_HTML, /class="wb-toolbox-header px-6 py-4 bg-white border-b border-slate-100/);
  assert.match(INDEX_HTML, /workbenchNav === 'knowledge' && workbenchRoute\.type === 'list'" class="wb-knowledge-page max-w-7xl mx-auto space-y-4/);
  assert.match(INDEX_HTML, /class="wb-knowledge-tabs flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1"/);
  assert.match(INDEX_HTML, /class="wb-knowledge-card bg-white rounded-xl border border-slate-200 overflow-hidden"/);
});

test('知识库标题区不使用大面积渐变铺色', () => {
  const knowledgeBlock = INDEX_HTML.match(/<!-- ======== 📚 团队知识库[\s\S]*?<\/template>/)?.[0] || '';
  assert.ok(knowledgeBlock, 'knowledge page block should exist');
  assert.match(knowledgeBlock, /class="wb-knowledge-section-header flex items-center gap-2 border-b border-slate-100 bg-white px-6 py-4"/);
  assert.match(knowledgeBlock, /<h2 class="text-slate-900 font-bold text-lg">AI资讯 · Builders Digest<\/h2>/);
  assert.match(knowledgeBlock, /<h2 class="text-slate-900 font-bold text-lg">全网动态 · 活水雷达<\/h2>/);
  assert.doesNotMatch(knowledgeBlock, /bg-gradient-to-r from-teal-600 to-emerald-600/);
  assert.doesNotMatch(knowledgeBlock, /text-white font-bold text-lg">(?:AI资讯 · Builders Digest|全网动态 · 活水雷达)/);
});

test('团队知识库保持白底而不是绿色铺色', () => {
  assert.match(INDEX_HTML, /\.wb-v2-workspace #v2-kb-section \.wb-toolbox-header[\s\S]*?background:\s*#fff !important/);
  assert.match(INDEX_HTML, /\.wb-v2-workspace #v2-kb-section > \.wb-knowledge-card[\s\S]*?background:\s*#fff !important/);
});

test('AI工具箱下方工具区统一绿色底色且右侧面板保持无底色', () => {
  const toolboxBlock = INDEX_HTML.match(/workbenchNav === 'ai' && workbenchRoute\.type === 'list'[\s\S]*?<\/div>\s*<\/div>\s*<div v-else-if="workbenchNav === 'aiApps'/)?.[0] || '';
  assert.ok(toolboxBlock, 'AI toolbox block should exist');
  assert.match(toolboxBlock, /aiToolbox\.activeTab === tab\.key \? 'bg-emerald-700 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'/);
  assert.match(toolboxBlock, /aiToolbox\.activeTool === tool\.key \? 'border-emerald-300 bg-emerald-50 shadow-sm ring-2 ring-emerald-100' : 'border-emerald-100 bg-emerald-50\/40 hover:border-emerald-200 hover:shadow-sm'/);
  assert.match(toolboxBlock, /<div class="min-w-0 p-1">/);
  assert.doesNotMatch(toolboxBlock, /border-\$\{aiToolboxTabColor\}-200 bg-\$\{aiToolboxTabColor\}-50\/40 p-5/);
});

test('AI应用中心不重复显示模块级标题说明区', () => {
  const aiAppsBlock = INDEX_HTML.match(/workbenchNav === 'aiApps' && workbenchRoute\.type === 'list'[\s\S]*?<\/div>\s*<div v-else-if="workbenchNav === 'knowledge'/)?.[0] || '';
  assert.ok(aiAppsBlock, 'AI applications block should exist');
  assert.doesNotMatch(aiAppsBlock, /汇聚团队猎头AI数字化项目/);
  assert.doesNotMatch(aiAppsBlock, /<h1 class="text-xl font-bold text-slate-900">AI应用中心<\/h1>/);
});

test('首页渠道漏斗不重复显示页面级和模块级说明标题', () => {
  const dashboardBlock = INDEX_HTML.match(/workbenchNav === 'dashboard' && workbenchRoute\.type === 'list'[\s\S]*?<\/div>\s*<div v-else-if="workbenchNav === 'companies'/)?.[0] || '';
  assert.ok(dashboardBlock, 'dashboard block should exist');
  assert.doesNotMatch(dashboardBlock, /渠道效果概览/);
  assert.doesNotMatch(dashboardBlock, /公司渠道经营/);
  assert.match(dashboardBlock, /<h2 id="home-talent-funnel-title"[^>]*>渠道漏斗<\/h2>/);
});

test('首页渠道漏斗保留大标题字号并放大其余信息文字', () => {
  const dashboardBlock = INDEX_HTML.match(/workbenchNav === 'dashboard' && workbenchRoute\.type === 'list'[\s\S]*?<\/div>\s*<div v-else-if="workbenchNav === 'companies'/)?.[0] || '';
  assert.ok(dashboardBlock, 'dashboard block should exist');
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-home-funnel h2 \{ font-size: 24px; \}/);
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-home-funnel \.wb-home-control \{ font-size: 15px; \}/);
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-home-pipeline-stage strong \{[^}]*font-size: 32px;/);
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-home-pipeline-label \{[^}]*font-size: 14px;/);
  assert.match(dashboardBlock, /class="wb-home-pipeline-label">\{\{ stage\.label \}\}/);
  assert.doesNotMatch(dashboardBlock, /渠道来源<\/span>/);
  assert.match(dashboardBlock, /v-for="channel in homeFunnelChannelOptions"/);
  assert.match(dashboardBlock, /openHomeFunnelChannelImport\(selectedHomeFunnelChannelRow\)/);
});

test('岗位库页面不重复显示内层岗位库标题', () => {
  const positionsBlock = INDEX_HTML.match(/workbenchNav === 'positions'[\s\S]*?<div v-else-if="workbenchNav === 'applications'/)?.[0] || '';
  assert.ok(positionsBlock, 'positions page block should exist');
  assert.doesNotMatch(positionsBlock, /<h1 class="font-bold text-slate-900">岗位库<\/h1>/);
  assert.match(positionsBlock, /positionLibrarySummary\.total/);
});

test('人才上传归类展开控件使用 SVG 下箭头', () => {
  const uploadCategoryRow = INDEX_HTML.match(/上传后归类人才[\s\S]*?<\/button>/)?.[0] || '';
  assert.match(uploadCategoryRow, /展开选择/);
  assert.match(uploadCategoryRow, /<svg[^>]*class="h-4 w-4 transition-transform"/);
  assert.match(uploadCategoryRow, /d="m6 9 6 6 6-6"/);
  assert.doesNotMatch(uploadCategoryRow, /展开选择[^<]*⌄/);
});

test('人才库筛选字段使用统一的纵向标签和控件尺寸', () => {
  const filterBar = INDEX_HTML.match(/<div class="wb-talent-filter-bar[\s\S]*?<\/div>\s*<\/div>\s*<section v-if="talentCloudSearch/)?.[0] || '';
  assert.ok(filterBar, 'talent filter bar should exist');
  assert.match(filterBar, /class="wb-talent-filter-field text-xs font-medium text-slate-500">触达时间/);
  assert.match(filterBar, /class="wb-talent-filter-field text-xs font-medium text-slate-500">学历/);
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-talent-filter-field\s*\{[\s\S]*?flex-direction:\s*column[\s\S]*?min-height:\s*64px/);
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-talent-filter-field input,[\s\S]*?\.wb-v2-workspace \.wb-talent-filter-field select\s*\{[\s\S]*?min-height:\s*36px/);
});

test('人才详情默认以原始简历为主视图并复用六个详情页签', () => {
  assert.match(INDEX_HTML, /const workbenchRoute = reactive\(\{ type: 'list', id: '', parentId: '', tab: 'resume' \}\)/);
  assert.match(INDEX_HTML, /function openCandidateDetail\(id,\s*tab = 'resume'\)/);
  assert.match(INDEX_HTML, /const candidateResumeView = reactive\(\{[\s\S]*?mode:\s*'original'/);
  assert.match(INDEX_HTML, /candidateDetailTabs = computed\(\(\) =>[\s\S]*?原始简历[\s\S]*?结构化信息[\s\S]*?推荐记录[\s\S]*?面试进度[\s\S]*?跟进记录[\s\S]*?AI分析/);
  assert.match(INDEX_HTML, /当前 Base/);
  assert.match(INDEX_HTML, /当前求职状态/);
});

test('人才详情推荐记录和面试进度展示候选人的全部推进关系', () => {
  assert.match(INDEX_HTML, /selectedCandidateApplications\.map|v-for="application in selectedCandidateApplications"/);
  assert.match(INDEX_HTML, /推荐日期|推荐时间/);
  assert.match(INDEX_HTML, /最近更新时间|更新时间/);
  assert.match(INDEX_HTML, /selectedCandidateInterviewApplications/);
  assert.match(INDEX_HTML, /pipelineStageSequence|applicationPipelineStages|candidatePipelineLabel\(application\.stage\)/);
});

test('人才详情跟进记录复用 followups 和 pipelineEvents 并按时间倒序', () => {
  assert.match(INDEX_HTML, /selectedCandidateFollowupItems/);
  assert.match(INDEX_HTML, /candidateCategoriesExpanded, selectedCandidateFollowupItems/);
  assert.match(INDEX_HTML, /followups/);
  assert.match(INDEX_HTML, /pipelineEvents/);
  assert.match(INDEX_HTML, /sort\(\(a, b\) =>[\s\S]*?Date\.parse/);
});
