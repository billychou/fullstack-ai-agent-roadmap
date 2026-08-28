看完了。结论可以下得比较明确：**这个仓库是一个"agent-native"项目——为 AI 编写、由 AI 维护而设计的**，而且它把"如何治理 AI 产出的工程文件"这件事做成了一套完整的制度。证据和解读如下：

## 一、代码是 AI 生成的吗？

逐行无法证实，但仓库里有多处直接证据表明 agent 是一等公民开发者：

1. **README 明说**：`For agents, follow AGENTS.md`；`docs/architecture.md` 甚至写着"我们建议用 agent 来探索这个代码库"——这是 dogfooding 姿态。
2. **`.agents/notes/AGENTS.md` 的定义原文**："Agent Notes 本质上是**由 agent 撰写的 RFC**"。
3. **专门写给 AI 的排障条款**：根 `AGENTS.md` 有一节 "Host sandbox failures"，指导 agent 在沙箱挡住凭据/网络时如何升级重试——这种指令只有"主要执笔者是沙箱里的 agent"时才说得通。
4. **专门清理 AI 痕迹的技能**（详见下文第三部分）：如果代码不是 AI 写的，根本不需要一个 8 类"思维链泄漏"分类学。
5. **git 作者是人类署名**（Tianyi Cui 等 DeepSeek 工程师，约 1.2 万+ 提交），说明模式是"**agent 执笔、人类署名并审校**"，而非无人值守生成。

## 二、它如何管理 AI 生成的工程文件

这套治理体系分五层，正好对应 AI 协作的五个失控点：

### 1. 指令层 —— 分层 `AGENTS.md`

根、`packages/`、`docs/`、`.agents/notes/` 各有一份 `AGENTS.md`（根目录的 `CLAUDE.md` 是它的软链接，说明用 Claude Code 类工具）。每层只放该层需要的规则，避免单个巨型提示词。核心手法是**规则自带链接**：每条约定都链到决策出处的 Agent Note，agent 违反规则时能顺着链接找到"为什么"。

### 2. 决策层 —— Agent Note 制度（`.agents/notes/`，约 1484 个文件）

这是最核心的机制，解决"**AI 会重新发明已被否决的方案**"这个经典问题：

- **生命周期即路径**：`proposed/` → `implemented/` → `rejected/` / `archived/`，状态写死在 `Status:` 行，门禁脚本交叉校验文件夹与状态是否一致
- **六分类闭集**：`feature / bug-fix / simplification / architecture / process / testing`，分类由 `agent-note-tree.ts` 强制，拒绝其他目录
- **强制"被否决的备选方案"章节**：原文理由很直白——"不记录被击败方案的决策会招来重新辩论"，这正是为了防止 agent 未来把旧方案当新想法再提一遍
- **冻结与墓碑**：`archived/` 永久封存（有哈希 sidecar 校验防篡改），`rejected/` 笔记保留到"它能防止某个诱人错误"为止才删——被否决的方案本身就是知识资产
- **每个非平凡改动必须在同一 PR 附带 Agent Note**，且有专门的 `dsh-archive-agent-notes` 技能做"取代检查"（新笔记落地前先搜有没有旧笔记被它取代）

### 3. 执行层 —— 技能即校准过的工作流（`.agents/skills/`）

11 个内部技能，把人类专家的操作经验固化给 agent：`dsh-pre-push-checks`（推送前跑哪些检查）、`dsh-code-review`、`dsh-prose-standard`（文档用词裁决）、`dsh-merging-stacked-prs`（堆叠 PR 合并）等。注意这些都是**判断类技能而非脚本**——沉淀的是"何时做何判断"，不是自动化步骤。

### 4. 质量层 —— 用机器门禁替代文风约定

团队显然不相信"提示词能管住 AI 的文风"，所以把约定全部变成可执行门禁：

- `verify-export-jsdoc`：每个导出必须有 JSDoc
- `verify-doc-budgets`：文档有字数预算，超了门禁失败
- `verify-agent-note-format`：笔记骨架（`## Problem` → `## Decision` → `## Alternatives considered` → `## Consequences`）由脚本强制，`implemented/` 笔记里出现 `## Proposal` 这种"提案体"标题直接拒绝
- 还有配套的 **postmortem 制度**（`docs/postmortem/`），事故复盘结论反哺门禁规则

### 5. 清理层 —— 主动去除 AI 痕迹（最有意思的部分）

`dsh-trim-cot-leakage` 技能把"思维链泄漏"分成 8 类并逐一治理：

表格

下载为表格

导出为图片

|泄漏类型|例子|
|---|---|
|设计会话死引用|`(decision 7)`、`(audit C2)`|
|PR 视角|"this PR adds"、"a later PR in this stack"|
|变更叙事|"used to"、"no longer"、"v1"|
|评审编排|"Rejected in review:"、"the reviewer confirmed"|
|面向评审者的自辩|"this cast is safe because…"|
|控制流复述|"first we X, then we Y"|
|模糊规划残留|"probably fine for now"|
|**工作语言残留**|中文片段（端、设计稿）混入英文文档|

判定标准只有一条：**"一个只能看到 HEAD 的读者，能否解析每个引用、验证每个断言？"** 第 8 类（未翻译的中文工作语言片段）还侧面印证了执笔 agent 的工作语言包含中文。配套理念是"**注释陈述不变量，而不是复述正确性**"——面向评审者的自辩被当作 AI 特有的坏味道。

## 三、人机分工的边界

这套体系里人类的职责被压缩到三件事：**评审 PR**、**审快照 diff**（"every JSONL diff is reviewed"）、**裁决决策**（rejected/implemented 的判定）。其余——格式、一致性、链接有效性、文档与代码同步——全部交给门禁机器。

## 对你的借鉴价值

如果你想在自己的项目里做类似的实践，这个仓库给出的最小可行组合是：

1. **AGENTS.md 分层**，每条规则链到决策出处
2. **ADR/决策笔记强制进 PR**，且必须写"被否决的备选方案"
3. **能用脚本检查的约定绝不用文字约定**
4. **专门定义"AI 坏味道"清单**并定期清理（变更叙事、自辩注释、死引用）
5. **把事故复盘变成新门禁**，而不是口头教训

其中第 4 点是最稀缺的——大多数团队用 AI 写代码，但几乎没人系统性地治理 AI 留下的文体痕迹。这个仓库把"AI 生成物如何变成可长期维护的人类资产"这件事走在了前面。