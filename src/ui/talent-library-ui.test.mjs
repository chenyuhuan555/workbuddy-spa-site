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
  assert.match(INDEX_HTML, /TalentLibrary\.buildRows\(\{[\s\S]*?candidates:\s*candidateSourceRows\.value,[\s\S]*?applications:\s*visibleApplications\.value,[\s\S]*?positions:\s*workbenchV2\.positions,[\s\S]*?companies:\s*workbenchV2\.companies,[\s\S]*?stageLabel:\s*candidatePipelineLabel,[\s\S]*?\}\)/);
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

  assert.match(INDEX_HTML, /min-width:\s*1540px/);
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
  assert.match(listBlock, /更多筛选/);
  assert.match(listBlock, /人才库专属搜索/);
  assert.match(INDEX_HTML, /\.wb-talent-library-page\s*\{[\s\S]*?background:\s*#f5f6f7/);
  assert.doesNotMatch(listBlock, /rounded-xl border border-slate-200 bg-white p-3/);
});

test('人才库使用左侧导航后的全宽工作区而不是居中 max-width 容器', () => {
  const workspace = INDEX_HTML.match(/<div v-if="workbenchRoute\.type === 'list' \|\| candidateDetailMode === 'drawer'[\s\S]*?<div data-talent-library-list/)?.[0] || '';

  assert.match(workspace, /class="[^"]*wb-talent-library-workspace[^"]*w-full[^"]*max-w-none[^"]*"/);
  assert.doesNotMatch(workspace, /max-w-7xl\s+mx-auto/);
  assert.match(INDEX_HTML, /\.wb-v2-workspace \.wb-v2-main:has\(\[data-talent-library-list\]\)[\s\S]*?padding:\s*0 28px 28px/);
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
  assert.match(INDEX_HTML, /function openCandidateDetail\(id,\s*tab\s*=\s*'overview'\)[\s\S]*?selectCandidateDetail\(id,\s*tab\);/);
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

  assert.match(listBlock, /更多操作/);
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
  assert.match(tabSets[2], /overview[\s\S]*?候选人概览[\s\S]*?resume[\s\S]*?简历[\s\S]*?matching[\s\S]*?岗位匹配[\s\S]*?applications[\s\S]*?推进记录[\s\S]*?interviews[\s\S]*?面试进度[\s\S]*?ai[\s\S]*?AI分析[\s\S]*?activity[\s\S]*?备注与动态/);
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

test('candidate drawer isolates the background and only exposes modal semantics while open', () => {
  const listWrapper = INDEX_HTML.match(/<div v-if="workbenchRoute\.type === 'list' \|\| candidateDetailMode === 'drawer'"[^>]*>/)?.[0] || '';
  assert.match(listWrapper, /:inert="candidateDrawerOpen"/);
  assert.match(listWrapper, /:aria-hidden="candidateDrawerOpen \? 'true' : undefined"/);
  const detailWrapper = INDEX_HTML.match(/<div v-if="workbenchRoute\.type === 'candidate' && selectedCandidate"[^>]*>/)?.[0] || '';
  assert.match(detailWrapper, /:role="candidateDrawerOpen \? 'dialog' : undefined"/);
  assert.match(detailWrapper, /:aria-modal="candidateDrawerOpen \? 'true' : undefined"/);
  assert.match(INDEX_HTML, /watch\(candidateDrawerOpen,[\s\S]*?document\.body\.classList\.toggle\('wb-candidate-drawer-open',\s*isOpen\)/);
  assert.match(INDEX_HTML, /onBeforeUnmount\(\(\)\s*=>\s*\{[\s\S]*?document\.body\.classList\.remove\('wb-candidate-drawer-open'\)/);
  assert.match(INDEX_HTML, /body\.wb-candidate-drawer-open\s*\{\s*overflow:\s*hidden;/);
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
