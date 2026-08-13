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
