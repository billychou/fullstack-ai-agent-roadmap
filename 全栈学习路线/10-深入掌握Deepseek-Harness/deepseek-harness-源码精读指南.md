# DeepSeek Harness（dsh）源码精读指南

> 定位：与《deepseek-harness 深度学习指南》（原理/上手/生态层面）互补，本文以**源码结构**为主线，给出逐包精读路线。所有文件路径均已在仓库（本地克隆 `/Users/songchuan.zhou/git/deepseek-harness`）中核实存在。
>
> 仓库状态提醒：项目处于 rc 预览期、迭代快，预发布阶段"宁可重构不保留兼容层"，本文基于 2026-08-21 的仓库快照，路径可能随后续提交漂移，以 `docs/architecture.md` 和各包 README 为最终权威。

---

## 阅读总路线图

仓库约 180 个包、45 个分组，但**真正需要精读的只有 20 个左右**——其余包都是同一个"capability seam 模式"的实例，读懂两三个就能举一反三。建议按以下六个阶段推进，每个阶段 1-3 次 сидение：

| 阶段 | 主题 | 核心目录 | 产出目标 |
|---|---|---|---|
| 0 | 概念框架 | `docs/`（5 份文档） | 建立"一切皆插件 / 三角色 seam / 事件溯源"心智模型 |
| 1 | Cordis 内核 | `docs/cordis-tutorial/` + `vendor/` | 看懂插件、Service、事件、Loader |
| 2 | 核心主干 | `packages/core/`（8 包） | 读懂一次 agent 任务的完整执行链 |
| 3 | 持久层 | `packages/session/`（13 包） | 读懂事件日志如何落盘与重放 |
| 4 | 能力家族 | `shell/`、`fs/`、`llm/`、`web/`、`subagent/` | 掌握 seam 三角色模式，能自己连线阅读任何能力包 |
| 5 | 特色与外围 | `typert/`、`sandbox/`、`interaction/`、`workflow/`、`skill/` | 理解 DSH 的差异化设计 |

每个阶段末尾附自测问题；答不上来就回去重读对应文件。

---

## 阶段 0：概念框架（读源码前必做）

**先读文档再读代码**，否则会在 180 个包里迷路。按此顺序：

1. `docs/architecture.md`（有 `architecture.zh.md` 中文版）——整体架构地图：插件内核、profile/bundle 组合、Turn flow、事件三分域。
2. `docs/glossary.md`（中文版齐）——术语表，两个词必须先背下来：
   - **capability seam**：一个可替换的能力 = Service Definition（声明 `ctx.<key>` 的 Cordis Service 抽象类）+ 一个或多个 Service Provider（实现）+ 一个或多个 Consumer（通常是对模型的工具）。例：`dsh-shell`（定义）+ `dsh-bash-local`（provider）+ `dsh-tool-bash`（Consumer）。
   - **turn / step / round**：turn = 一次被准入输入的排空；step = 一次模型请求 + 其引发的工具执行；round = 包含 turn 的外层策略迭代（如 goal round）。
3. `docs/cordis-primer.md`（中文版齐）——Cordis 五个核心观念与事件派发模式（emit / waterfall / parallel / serial）。
4. `docs/development.md`（中文版齐）——TypeScript 双聚合工程（Host/Client）、source plane vs artifact plane，理解为什么有两个 tsconfig。
5. `vendor/README.md`——vendored Cordis 是什么：框架层不是 npm 依赖而是源码拷贝（9 个包，锁上游 commit，18 条本地修改记录全部登记在案）。

**阶段 0 自测：**
- 一个新能力（比如"加一个数据库查询工具"）在 DSH 里应该拆成哪三个包？各自职责？
- waterfall 监听器不调用 `next()` 会发生什么？（答：短路链条，值不再向下传播）
- "Model-visible means logged" 是什么意思，由什么机制保证？

---

## 阶段 1：Cordis 内核

DSH 的所有包都是 Cordis 插件，不懂 Cordis 寸步难行。好消息是仓库自带 7 课教程，且**全部有中文版**：

`docs/cordis-tutorial/`（按序读 `.zh.md` 版本）：

1. `01-first-plugin` — 写第一个插件：函数插件 vs Service 子类
2. `02-lifecycle-and-effects` — `ctx.effect()` / `ctx.on()`：注册即 effect，卸载自动回退
3. `03-services` — Service 与 `inject` 声明式依赖
4. `04-events` — 类型化事件、declaration merging、`@mode` 标注
5. `05-config` — cordis.yml 与 `!!js` 配置（注意是双感叹号，`!js` 是错的）
6. `06-composition-and-hmr` — Loader 组合与热重载
7. `07-into-the-harness` — 从框架进入 harness 的桥

之后浏览 `vendor/cordis/src/` 的目录结构即可（`fiber.ts` 有本地加固，18 条修改见 vendor/README.md），不必逐行精读框架源码——把它当"操作系统的系统调用层"。

**两个本仓库的插件形态约定**（来自 `packages/AGENTS.md`，读任何包前先知道）：

- Service 包 default-export 服务类；函数插件具名导出 `name` / `inject` / `Config` / `apply`，**没有 default export**。混用两者会导致 Loader 丢弃函数插件的 namespace（有专门的事故 postmortem：`docs/postmortem/0001-acp-default-export-drops-inject.md`）。
- 可选服务用 `ctx.get(name)`，声明注入才用 `ctx.<name>` 属性代理。

**阶段 1 自测：**
- 函数插件和 Service 插件分别什么时候用？导出形态有什么区别？
- 为什么每个注册都要返回 disposer（或走 `ctx.effect()`）？
- cordis.yml 里 `disabled` 字段的 `!!js` 表达式在什么时候求值？

---

## 阶段 2：核心主干（packages/core/，本指南重点）

core 组 8 个包构成产品 API 主干。精读顺序刻意按"数据流"而非字母序：**先会话（真相源），再提示词，再工具，最后循环（把它们串起来）**。

### 2.1 core/session —— 事件溯源会话（先读，一切的基础）

> 约 3164 行。这是整个 harness 的"单一真相源"，其他所有核心包都在围绕它转。

精读顺序：

1. `src/types.ts`（440 行）——`SessionEventMap` 定义处。merge-extensible：插件通过 `declare module` 增补事件（例如 `dsh-tools` 的 types.ts 会加 `tool/code-dispatch`）。核心事件词汇：`turn/start|end`、`step/start|end`、`user/message`、`assistant/chunk`、`assistant/message`、`tool/call`、`tool/result`、`request/header|context`。注意 `SESSION_FORMAT_VERSION`（当前为 0，无兼容承诺）。
2. `src/index.ts`（1157 行）——`Session` 类：`append()` 追加事件（校验无损 JSON、维护连续 seq）；**`deriveMessages()` 从日志推导 LLM 消息历史**——这是"每次模型请求都从 session log 派生"的落点，也是"模型可见即已记录"不变量的实现基础。`SessionStore` 服务（`ctx.sessions`）管理注册。
3. `src/json.ts` —— 事件 JSON 编解码。
4. `src/surface.ts`（460 行）——模型可见 surface 组装。
5. `src/invariant.ts`（250 行）——运行时不变式断言，**每个包的 invariant.ts 都是快速把握包契约的第二入口**（全仓库通用技巧）。

### 2.2 core/system-prompt —— 提示词组装

> `src/index.ts`（545 行），`SystemPrompt extends Service`（`ctx.systemPrompt`）。

插件经四种注册贡献内容，全部支持 agent 作用域覆盖全局（经 `core/scope` 的 ScopedLayers）：

- `section()`：有序片段（约定 -100 = harness 身份，0 = persona，100-199 = 工具说明）
- `context()`：动态运行时上下文（渲染为 user 角色 runtime-context 快照）
- `tools()`：工具 schema 提供者
- `variable()`：`{{variable}}` 插值（agent-loop 注册了 `provider`/`model`/`cwd`）

`assemble()` 合并各层 → 排序 → 跑 `system-prompt/assemble` waterfall → `PromptAssembly`；`renderPrompt()` 严格插值，未知变量直接抛错（misconfiguration fails loud）。

### 2.3 core/tools —— 工具注册与执行管线

> 约 5628 行，core 组最大。`src/index.ts`（1946 行），`ToolRuntime extends Service`（`ctx.tools`）。

1. `ToolDefinition` 接口：`name/description/parameters` + **必须的 `output: {schema, render}` 输出契约** + `execute` + 可选 `isConcurrencySafe/presentCall/presentResult`（呈现意图是工具设计的一部分，`src/presentation.ts`）。
2. 执行管线（重点）：`tools/pre-execute → guards → tools/execute → 工具体 → tools/post-execute → tools/result` 瀑布，支持审批挂起（ask）与 Code Mode 折叠（`src/code-mode.ts`，681 行，`run_code` 工具）。
3. `src/schema.ts` 的 `defineTool` 辅助构造器、`src/json-schema.ts`。
4. `src/py-types.ts` / `ts-types.ts`：Python/TS 类型绑定生成（为 Code Mode 服务）。

### 2.4 core/agent + core/agent-loop —— 循环本体

> agent（1636 行）定义词汇与调度，agent-loop（1662 行）是具体实现。**AGENTS.md 规定 agent-loop 是禁区：新行为挂扩展点，不改循环**（改它必须更新 architecture.md）。

1. `core/agent/src/types.ts` + `index.ts` —— `Agent` 接口、注册表（`ctx.agents`）、initiator scope。
2. `core/agent/src/inbox.ts`（220 行）—— `Inbox`：`send` / `steer` / `inject` 分别对应 next-turn / next-step 注入。
3. `core/agent-loop/src/index.ts`（713 行）—— `AgentLoop extends Service implements AgentFactory`，`static inject = ['agents','sessions','llm','tools','systemPrompt']`（一行看清五个核心服务的依赖关系），负责 `create`/`resume`。
4. `core/agent-loop/src/agent.ts`（515 行）—— **`ReactLoopAgent`**，核心状态机（`idle | maintenance | running`）。循环伪代码（kick → turn → step 三层）：

```
wakeDriver() → kick() 内 while (await this.turn()) {}
turn():  session.append('turn/start')
         循环 preStep()  // Inbox 领取输入 + systemPrompt.assemble() + agent/pre-step waterfall
         → append('user/message') → step() → append('turn/end')
step():  buildRequest()  // 请求头经 agent/request waterfall，写 request/header 事件
         → ctx.llm.stream()  // 每个 chunk 追加 assistant/chunk 事件
         → 组装 assistant/message
         → 无工具调用则本 turn 完成；有则 executeToolCalls() 后回到下一 step
```

5. `core/agent-loop/src/tool-calls.ts`（289 行）—— `executeToolCalls`：按 `isConcurrencySafe` 分并行/独占组，经 tools 包的 `TOOL_RUNTIME_SCHEDULER`（prepare/dispatch/finalize 分段），结果按模型顺序提交为 `tool/call` / `tool/result` 事件。

### 2.5 剩余三包（快速过）

- `core/scope`：scoped-context 注册原语。**shadowing 语义**：贡献分 global/scoped 两层扁平结构（不向下继承），最具体的同名工具/提示段替换全局版本。`src/scoped-events.generated.ts` 是生成物。
- `core/agent-default-model`（137 行）：Agent 入口共享默认模型选择。
- `core/agent-tool-presentation`（104 行）：Code Mode / 原生 / 组合三种呈现的选择器。

### 配读：入口链（把 core 串到 CLI）

从命令行到 agent 启动的完整路径：

```
apps/cli/src/bin.ts            # dsh 可执行入口，解析 flags
  → apps/cli/src/profile-boot.ts  # runProfile()
    → packages/boot/app-boot      # 解析 $DSH_HOME/profiles/<name> 的分层配置
    → packages/boot/cmdline       # cmdlineArgs 交给树内 app 插件
      → packages/bundle/base/cordis.patch.yml  # dsh-base：所有 profile 的首层，
        #  以 Loader patch 形式挂载 dsh-llm / dsh-session / dsh-agent / dsh-tools /
        #  dsh-system-prompt / dsh-agent-loop / session-persistence-jsonl / tool-todo / shell 系列
        → packages/bundle/headless  # 一次性任务：agents.create() → 驱动到 whenIdle() → 刷 session → 退出
```

想看实际启动树：`pnpm dsh --profile headless --dump-config "task"`。可运行示例在 `examples/headless-agent`、`examples/acp-agent`、`examples/jsonrpc-agent`。

**阶段 2 自测：**
- 一次 turn 中 `agent/pre-step` waterfall 发生在哪两步之间？它可以做什么？
- 工具结果为什么不直接写进 LLM 消息数组，而要走 session 事件再 `deriveMessages()`？
- 两个同名工具，一个全局注册一个 agent 作用域注册，模型看到哪个？
- `executeToolCalls` 如何决定哪些工具并行？

---

## 阶段 3：持久层（packages/session/，13 包）

core/session 只管内存服务，持久化刻意分离到 session 分组。精读三个，浏览其余：

1. `session/session-persistence` —— `src/coordinator.ts` 的 `PersistenceCoordinator`：共享缓冲、write-behind 批写（默认 200ms）、加载校验、修复编排；版本不匹配直接拒绝（`SessionFormatUnsupportedError`）。
2. `session/session-persistence-jsonl` —— `src/format.ts`：JSONL 磁盘格式（首行 SessionHeader、seq 连续可截断修复、可选 zstd）。`session-persistence-sqlite` 是另一后端（chunk-row 打包），二选一读。
3. `session/session-projection` —— 投影类型表 + `ctx.sessionProjections`；配套 `session-projection-cache`（持久投影缓存与冷读阶梯）。

其余扫一眼 README 即可：checkpoint-policy（模型请求/工具副作用前语义检查点）、session-stats、session-telemetry(-otel)、session-title 系列（LLM 生成标题的三种策略）、session-log-export。另有 `session-query` 分组（SQLite FTS5 全文检索 + 模型面历史检索工具）。

**自测：** 写盘是同步的吗？崩溃时如何保证日志可修复？"旧运行时无法正确读取新日志才 bump 版本"和"每次结构变更都 bump"有何区别？

---

## 阶段 4：能力家族（掌握三角色模式，本阶段后可自由阅读任何包）

从 shell 开始——它是全仓库**约定模板**，AGENTS.md 明确指定为"显式优于隐式"的范例。

### 4.1 shell 组（必精读）

三角色连线：

- **Definition**：`shell/shell/src/index.ts` —— 抽象类 `ShellExecutor`（`ctx.shell`，一个 context 仅允许一个实现）+ `types.ts` + `render.ts`
- **Provider**：`shell/bash-local`（经 `ctx.subprocess` 以 `bash -c` + 进程组执行）、`bash-sandbox`、`pwsh-local`、`pwsh-sandbox`
- **Consumer**：`shell/tool-bash`（模型侧 bash 工具，后台命令走 `ctx.jobs`）、`tool-bash-persistent`（PTY 持久 shell）、`shell-env`（`DSH_*` 环境注册表）

**request/spec split 精读点**（`shell/shell/src/types.ts` 的 `ShellExecRequest` 与 `index.ts` 的 `resolve()`）：模型/插件视角的请求字段全部可选（workdir、timeoutMs、stdoutMaxBytes 可省略）；实现方必须先经抽象方法 `resolve(request): ShellExecSpec` 显式应用默认值与上限钳制，产出全必填的 spec；`run(spec)` 只接受 spec、拒绝裸 request。包边界的默认值绝不允许是 `run()` 里隐藏的 `?? default`。另外注意 `env`/`stdin` 字段仅限进程内受信插件使用，模型侧工具不暴露——这是信任边界设计。

### 4.2 fs 组

`fs/fs/src/index.ts`（`FileSystem`，`ctx.fs`：规范路径/URI、有界文本 IO、版本守卫原子变更）→ provider `fs-local`（realpath 身份）、`fs-sandbox` → 策略门 `fs-observation-policy`（observed-state、read-before-edit）→ Consumer `tool-fs`（read/write/edit）、`tool-fs-search`（打包 ripgrep 的 glob/grep）、`tool-str-replace-editor`。fs 和 shell 共享"执行世界"——指向远端沙箱时两者一起迁移，这是 seam 设计的威力。

### 4.3 llm 组

- Definition：`llm/llm/src/index.ts` —— `LlmRuntime`（`ctx.llm`），adapter 注册表 + `llm/stream` waterfall 可拦截；配套读 `message.ts`（消息/内容块词汇）、`assembler.ts`（流 chunk 组装）、`retry-policy.ts`。
- Provider：`llm/llm-deepseek/src/adapter.ts`（DeepSeek chat-completions 适配器，serialize/translate/sse 三件套）；另有多 provider 路由的 `llm-pi-ai`、重试拦截的 `llm-retry`、token 计量的 `llm/token-meter`。
- Consumer：agent-loop 本身（llm 包是"无独立工具 Consumer"的反例——Direct Consumer 是循环）。

### 4.4 三个快速连线练习（检验你已掌握模式）

- **web**：`web/web/src/index.ts`（`WebRuntime`，search/fetch 双注册表，provider 解析规则：配置 id 优先，否则要求恰好一个可用）→ `web-search-deepseek` / `web-search-exa` / `web-search-perplexity` / `web-fetch-http` → `tool-web/src/{search,fetch}.ts`。注意 web/AGENTS.md 的安全规则：带凭据的 provider 请求禁止跟随重定向。
- **subagent**：`subagent/subagent/src/index.ts`（`ctx.subagents` **命名 provider 注册表**，与 shell 的单实现形成对比）→ 七个 provider（进程内 fork/spawn、ACP 子进程、claude-code、codex、dsh-sdk）→ `tool-subagent` / `tool-subagent-control` / `tool-subagent-report`。
- **skill**：`skill/skill/src/index.ts`（provider 注册表，按 scope+rank 解析同名技能胜者）→ `skill-filesystem`（扫描本地目录解析 `SKILL.md`——即 Anthropic Claude Skills 格式兼容）→ `tool-skill`。

**自测：** 不看笔记，画出 web 能力的三角色连线并写出三个包路径。subagent 的注册表形态和 shell 有何不同、为什么？

---

## 阶段 5：特色机制与外围

### 5.1 typert（DSH 差异化设计，值得单独一天）

四包分离"源码分析 / 运行时存储 / Loader 发现 / 线协议"，解决的问题是**跨进程 RPC 需要从 TypeScript 类型自动生成 wire schema 与调用描述符，免除手写协议**：

- `typert/generator/src/analyzer.ts`（3113 行）—— 用独立 `ts.Program` 把源码类型树转成编译器无关的 `FaceModel`/`TypeGraph`；`emitter.ts` 产出可执行 JS（含 Zod schema 与 `TYPERT` contribution）
- `typert/registry/src/service.ts` —— `ctx.typert`：按 `<package>#<face>` 存运行时反射、按 `<package>#<name>` 存 Zod schema，`toJSONSchema()` 按需投影
- `typert/loader/src/index.ts` —— 扫 Loader 条目导入各包 `./typert` 产物并注册
- `typert/protocol/src/types.ts` —— `InvocationDescriptor`、编解码契约

配读 `docs/subsystems/typert.md` 与 `docs/api-gateway.md`（`@Remote`/`@RemoteScope`：Host 声明可调用方法，构建生成双端类型，Client 经 `ctx.remote` 调用）。

### 5.2 沙箱与安全

- `sandbox/sandbox-local`：bwrap（Linux）/ landlock / Seatbelt（macOS）/ Windows ACL 四后端，**fail-closed**；`native/` 目录是 landlock 的 node addon 源码
- 权限体系刻意与沙箱分离：`interaction/permission-presets`（权限预设）管"允不允许"，sandbox 管"能逃到哪"
- `interaction/user-approval`：一次性审批 waterfall + `approval/asked|decided` 会话审计事件，**无应答者时 fail-closed**
- `interaction/tool-ask-user` + `user-questions`：工具调用可暂停直至人类作答

### 5.3 workflow 与编排

`workflow/workflow`（`ctx.workflowEngine`）→ `workflow-worker-thread`（每个 run 在新 worker thread 的可逃逸 vm 沙箱中执行**模型编写的**编排脚本，`agent()` 调用桥接宿主 subagent）→ `tool-workflow` / `tool-ralph`（Ralph 循环：每轮全新子会话，跨轮状态靠共享工作区 + 有界 handoff 报告）。

### 5.4 其余分组速查（按需查阅，各有 README）

sandbox 之外还有：compaction（token 压力摘要 + 无模型修剪）、context（AGENTS.md/CLAUDE.md 加载、@file 引用）、hooks（Claude Code/Codex 钩子桥接）、mcp-client（外部 MCP 工具注册进 `ctx.tools`）、sdk（stdio JSON-RPC 协议 + TS/Python 双端）、acp（自动化专用 Agent Client Protocol 服务器）、preset（cordis.yml 组合 per-session agent）、extensions（agent 检查/挂载自己的插件——自指能力）、client 组 37 包（web GUI 浏览器半区，React 技术栈，有 ui-layout 三栏布局、ui-tool 工具调用树渲染等）。

---

## 实操建议

- **跑起来再读**：`pnpm install` 后 `pnpm dsh --profile headless "列出当前目录文件"`，对照阶段 2 的循环伪代码看 session 日志文件（JSONL 格式，逐事件可读，本身就是最好的教材）。
- **读包的固定套路**（适用于全部 180 包）：README（含 Model Experience 段）→ `src/types.ts`（仅类型）→ `src/index.ts`（服务主体）→ `src/invariant.ts`（包契约断言）→ tests/（行为描述而非正确性描述）。
- **查真相的优先级**：`docs/subsystems/`（每子系统一页，含粘贴的源类型，有 `type-equiv` 机制防漂移）> 各包 README > 本指南。中文文档普遍存在（`*.zh.md`），但生成类目录（tool-catalog 等）以英文源为准。
- **改代码前**：读 `docs/defensive-patterns.md`（生命周期/并发/子进程/teardown），并记住预发布阶段的"foundation over blast radius"原则——重构不背兼容包袱。

---

## 附录：一页速查

**五大核心 ctx key**：`ctx.sessions`（事件日志）、`ctx.systemPrompt`、`ctx.tools`、`ctx.agents`、`ctx.llm`（agent-loop 一行 inject 全部五个）。

**三类事件域**：Session 事件（持久事实，重载后存活）、Agent 事件（`agent/*`，携带活跃 Agent）、Capability 事件（`fs/*`、`tools/*` 等，挂策略与适配器）。

**新行为挂接点**：加模型 → `ctx.llm`；加能力 → `ctx.tools`；拦截请求/工具/turn → `agent/*`、`tools/*` 事件；注入模型上下文 → `agent.inject()`；持久会话状态 → 扩展 `SessionEventMap`。

**turn 完整事件序**：`turn/start → agent/pre-step → step/start → agent/request → llm/stream → assistant/chunk* → assistant/message → tools/pre-execute/execute/post-execute → tool/call|result → step/end → agent/turn-stopping → turn/end`。
