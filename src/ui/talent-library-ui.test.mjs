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
  assert.match(INDEX_HTML, /const talentLibraryFilters = reactive\(\{[\s\S]*?base:\s*'',\s*positionId:\s*'all',\s*stage:\s*'all',\s*education:\s*'all',[\s\S]*?intake:\s*\{\s*preset:\s*'all',\s*from:\s*'',\s*to:\s*''\s*\},[\s\S]*?touch:\s*\{\s*preset:\s*'all',\s*from:\s*'',\s*to:\s*''\s*\},[\s\S]*?recommendation:\s*\{\s*preset:\s*'all',\s*from:\s*'',\s*to:\s*''\s*\},[\s\S]*?\}\);/);
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
