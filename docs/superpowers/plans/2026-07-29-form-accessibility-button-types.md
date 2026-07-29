# 表单可访问性与按钮类型 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 所有按钮具有明确类型，所有非隐藏表单控件具有可访问名称，并让现有字段错误可被读屏软件关联。

**Architecture:** 使用 parse5 对真实 HTML 建立结构化静态审计，避免正则误判包裹式 label。修复按“业务表单可见 label、紧凑工具栏 aria-label”分区进行，不改变现有业务提交逻辑。

**Tech Stack:** HTML、Vue 模板、parse5、Node `node:test`、WCAG 2.1 AA 语义。

---

### Task 1: 建立结构化可访问性静态测试

**Files:**
- Create: `src/accessibility-static.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: 固定审计解析器版本**

Run: `npm install --save-dev --save-exact parse5@7.3.0`

Expected: `package.json` 出现精确版本 `"parse5": "7.3.0"`，lockfile 更新。

- [ ] **Step 2: 写失败测试**

使用 `parse(indexHtml, { sourceCodeLocationInfo: true })` 遍历 DOM，建立父节点 Map、所有 `id`、`label[for]`。测试要求：

```js
test('所有按钮显式声明合法 type', () => {
  const invalid = elements('button').filter(node => !['button', 'submit', 'reset'].includes(attr(node, 'type')));
  assert.deepEqual(lines(invalid), []);
});

test('所有非隐藏控件具有可访问名称', () => {
  const missing = controls().filter(node => !isHidden(node) &&
    !attr(node, 'aria-label') &&
    !validIdReference(node, 'aria-labelledby') &&
    !hasExplicitLabel(node) &&
    !hasMeaningfulWrappingLabel(node));
  assert.deepEqual(lines(missing), []);
});

test('label 和 aria 引用指向真实唯一 id', () => {
  assert.deepEqual(duplicateIds(), []);
  assert.deepEqual(brokenReferences(['for', 'aria-labelledby', 'aria-describedby']), []);
});
```

失败信息必须输出行号、标签名、`v-model` 和 placeholder，便于逐项修复。

- [ ] **Step 3: 验证测试失败**

Run: `node --test src/accessibility-static.test.mjs`

Expected: FAIL，报告约 150 个无类型按钮和所有真实缺名控件的行号。

- [ ] **Step 4: 保持测试文件未接入总测试**

在全部违规项修完前，不把该文件加入 `npm test`，也不提交一个已知红灯的测试基线。继续进入 Task 2。

### Task 2: 修复全部按钮类型

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 生成精确待修列表**

Run: `node --test src/accessibility-static.test.mjs`

Expected: 输出所有缺少/非法 type 的行号。当前基线为 150 个。

- [ ] **Step 2: 修复表单提交按钮**

当前 `addTalentMainCategory` 表单中的“新增主分类”必须改为：

```html
<button type="submit" class="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-semibold">新增主分类</button>
```

登录、创建公司、创建岗位、保存岗位描述、创建成员、顾问提问等已有显式 submit 的按钮保持不变。

- [ ] **Step 3: 修复非提交按钮**

所有不在表单内的无类型按钮，以及表单内的取消、删除、切换、打开、分页、重试按钮，增加 `type="button"`。不要更改 `@click`、`:disabled`、class 或文字。

- [ ] **Step 4: 验证**

Run: `node --test src/accessibility-static.test.mjs`

Expected: “所有按钮显式声明合法 type” PASS；按钮总数仍为 451 或仅因分页 UI 增加，点击处理器数量不减少。

Run: `npm test`

Expected: 现有正式测试全部 PASS；可访问性测试尚未接入总命令。

- [ ] **Step 5: 提交**

```powershell
git add index.html src/accessibility-static.test.mjs package.json package-lock.json
git commit -m "fix: declare explicit type for every button"
```

### Task 3: 修复业务表单可见标签和错误关联

**Files:**
- Modify: `index.html:3854-3885,4171-4177,4200,4322-4323,5313-5340`
- Modify: `src/accessibility-static.test.mjs`

- [ ] **Step 1: 登录和密码表单**

为用户名、密码、新密码等控件分配 `wb-login-username`、`wb-login-password`、`wb-new-password` 等稳定 ID，并使用：

```html
<label for="wb-login-username">用户名</label>
<input id="wb-login-username" name="username" autocomplete="username" ...>
```

登录错误容器使用 `id="wb-login-error"`，有错误时相关控件增加 `aria-describedby="wb-login-error"`。

- [ ] **Step 2: 创建公司和岗位表单**

将每个输入/选择器包在现有网格中的 `<label class="text-sm text-slate-600">` 内，加入稳定 ID；label 可见文字分别为公司名称、行业、所在城市、负责人、客户状态、岗位名称、工作城市、薪资范围、岗位负责人。placeholder 只保留示例内容，不再包含唯一字段名。

- [ ] **Step 3: 成员和岗位描述表单**

岗位描述已有包裹式 label，补稳定 ID 即可。成员创建表单为用户名、显示名称、初始密码、角色增加显式 label；错误信息通过 `aria-describedby` 关联。

- [ ] **Step 4: 验证本区**

Run: `node --test src/accessibility-static.test.mjs`

Expected: 上述表单不再出现在缺名或无效引用列表；仍有工具栏/旧页面项目时测试保持 FAIL。

- [ ] **Step 5: 提交**

```powershell
git add index.html src/accessibility-static.test.mjs
git commit -m "fix: label primary workbench forms"
```

### Task 4: 修复搜索、筛选和剩余控件

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 紧凑控件使用 aria-label**

公司搜索/状态/负责人、人才搜索/方向/状态/负责人、推进搜索/公司/岗位/阶段/负责人等工具栏控件保留紧凑布局，增加准确 aria-label，例如：

```html
<input type="search" aria-label="搜索公司、行业或负责人" ...>
<select aria-label="按公司状态筛选" ...>
<select aria-label="按推进阶段筛选" ...>
```

- [ ] **Step 2: 按失败清单逐项归类剩余控件**

对静态测试输出的每一行应用固定规则：编辑/创建表单增加可见 label；工具栏和表格内联编辑增加 aria-label；纯展示控件不得用 `title` 冒充主要名称。动态行控件的 aria-label 应包含字段意义而不是不稳定的序号。

- [ ] **Step 3: 修复引用和重复 ID**

运行测试，修复所有 `for`、`aria-labelledby`、`aria-describedby` 的断链；动态 `v-for` 控件需要使用 Vue 绑定生成唯一 ID，例如 ``:id="`candidate-owner-${candidate.id}`"``。

- [ ] **Step 4: 完整验证**

将 `src/accessibility-static.test.mjs` 加入 `package.json` 的 `test` 脚本。

Run: `npm test`

Expected: 全部 PASS；非隐藏控件缺少可访问名称数量为 0；断链引用和重复静态 ID 数量为 0。

- [ ] **Step 5: 浏览器键盘回归并提交**

验证 Tab 顺序、label 点击聚焦、Enter 只提交预期表单、分页/取消按钮不提交表单。

```powershell
git add index.html package.json
git commit -m "fix: give every form control an accessible name"
```
