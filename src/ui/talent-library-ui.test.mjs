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
  assert.match(INDEX_HTML, /function openCandidateDetail\(id,\s*tab\s*=\s*'overview'\)[\s\S]*?Object\.assign\(workbenchRoute,[\s\S]*?tab\s*\}\);/);
});
