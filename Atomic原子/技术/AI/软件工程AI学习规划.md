---
title: 软件工程 AI 方向学习课程规划——AI 增强的开发工作流
date: 2026-08-21
tags:
  - 学习规划
  - AI
  - Agent
  - 软件工程
status: doing
---

# 软件工程 AI 方向学习课程规划 —— AI 增强的开发工作流

> 定位：个人进阶学习路线。目标是在 3–4 个月内，把"用 AI 写代码"升级为"用 AI 工程化地交付软件"——即掌握以 Agent Harness 为核心的新一代开发范式，同时补齐支撑这一范式的软件工程核心知识。
>
> 编写日期：2026-08-21 ｜ 前置基础：React、FastAPI、LangChain 1.x 基础（见 [[00-学习大纲]]）

---

## 零、设计思路

### 为什么是"AI 增强的开发工作流"而不是"AI 应用开发"

两条线容易混淆，先划清边界：

- **AI 应用开发**：你已有路线（LangChain 系列 [[00-学习大纲]]～[[07-实战项目]]）——解决"如何给自己的产品加上 AI 能力"
- **AI 增强的开发工作流**（本规划）：解决"如何让 AI 深度参与我自己的开发过程"——把 Agent Harness 当成开发环境、把 LLM 当成结对程序员

选择后者作为本规划主线，因为它正处于范式切换的窗口期（2026 年 DSH 开源爆火、Claude Code 成熟、Graph Engineering 兴起），且与你已有的 DSH 学习直接衔接。同时 AI 应用开发路线继续并行推进，两线在"Agent 工程原理"处交汇。

### 知识主线：一条公理 + 三大支柱 + 十二步

**公理**：`Agent = Model + Harness`。模型在变强是免费的，不免费的是模型周围的系统——上下文、工具、记忆、循环、图、框架、评估（[[Agent工程师12步路线图]] 的七大支柱）。

**三大支柱**（支撑你看懂并驾驭 Harness 的软件工程底座）：

1. **配置管理**：profiles / precedence / overrides——理解 DSH 的 Profile/Patch、环境隔离、12-Factor
2. **依赖注入与装配**：组合根、声明式装配——理解 Cordis 插件内核、Spring/Vite 等一切框架的装配思想
3. **设计原则与架构**：SOLID、开闭原则——理解"一切皆插件"为什么成立、如何设计可扩展系统

**十二步**：上下文 → 工具 → 记忆 → 循环 → 图 → 框架 → 评估，按"基础→执行→可靠性"顺序展开。

---

## 一、课程地图（四阶段，约 14 周）

```
阶段一 · 基础层（第 1–3 周）
  软件工程核心课 + 上下文工程
  ── 理解 Harness 为什么长这样
        │
阶段二 · 执行层（第 4–7 周）
  Agent 工作流实操：工具、记忆、循环、图
  ── 把 DSH / Claude Code 用成生产力
        │
阶段三 · 可靠性层（第 8–11 周）
  Harness 工程化 + Evals 评测体系
  ── 让 Agent 输出可信任、可度量、可接力
        │
阶段四 · 融合层（第 12–14 周）
  毕业项目：用 Agent 工作流交付一个真实产品
  ── 全栈 SaaS + 全程 AI 增强开发
```

---

## 二、阶段一：基础层（第 1–3 周）

> 目标：补齐软件工程三大支柱，建立上下文工程的直觉。学完后看任何 Harness 类项目（DSH、Claude Code、Codex）的架构文档不再有概念盲区。

### 第 1 周：配置管理

| 主题 | 学习内容 | 动手任务 |
|---|---|---|
| 分层配置与优先级 | DSH 的 settings.yaml 分层、patch 整行替换语义；Vite mode 与 .env 体系；12-Factor App 的配置条目 | 用 `dsh --dump-config` 解剖 web 和 headless 两个 profile 的差异，写一篇笔记 |
| Profile 模式 | Spring profiles、Maven profiles、Docker Compose --profile、AWS CLI profile——横向对比同一名词在不同生态的实现 | 在你的 health_scan 项目里设计 dev/prod profile 分离方案（即使不实施，写成设计文档） |

### 第 2 周：依赖注入与装配

| 主题 | 学习内容 | 动手任务 |
|---|---|---|
| IoC / DI 原理 | Martin Fowler《Inversion of Control Containers and the Dependency Injection pattern》；控制反转的两种形态 | 读一遍 + 写摘要笔记（重点：组合根概念） |
| Cordis 插件内核 | [[deepseek-harness学习指南]] 1.2 节；Cordis 论文的 abstract；`apply(ctx)` / `inject: ['tools']` / Service 三种插件形态 | 对照 React 的 Context/Hooks 写一篇"前端人视角的 DI"笔记 |
| 时空可组合性 | 复习"积木拼上/无痕拆下"；revertible effects 与 useEffect cleanup 的对比 | 把这段理解讲给别人（费曼法），或写成公众号短文 |

### 第 3 周：上下文工程

| 主题 | 学习内容 | 动手任务 |
|---|---|---|
| 上下文即 RAM | 12 步路线图 01–02 步：Karpathy 比喻、7850 tokens 底噪、/context 命令、200 行 CLAUDE.md 原则、树形分层 | 审计你自己的项目：为 health_scan 和知识库各写一份 CLAUDE.md/AGENTS.md |
| AGENTS.md / SKILL.md | [[DeepSeek-Harness-一切皆插件]] 相关章节 + Anthropic Agent Skills 规范 | 写 2 个实用 Skill（如"知识库笔记规范检查"），验证触发率 |

**里程碑 M1**：一份《三大支柱概念地图》笔记（把配置管理/DI/开闭原则用一张图串起来）+ 一份可用的项目 CLAUDE.md。

---

## 三、阶段二：执行层（第 4–7 周）

> 目标：把 DSH（或 Claude Code）真正用进日常工作流，每天至少有一个真实任务交给 Agent 完成。学完你应该是"团队里最会用 Agent 的人"。

### 第 4 周：工具与 MCP

| 主题 | 学习内容 | 动手任务 |
|---|---|---|
| 工具设计哲学 | 12 步路线图 03 步：有表达力的参数胜过示例（"the type is the documentation"）、延迟加载、检索式工具描述 | 审计 health_scan 的 Agent 工具定义，按新原则重写一个工具的 schema |
| MCP 实操 | MCP 协议（stdio/streamable-http）、dsh-mcp-bridge 接入 filesystem/github 服务 | 给 DSH 接入一个 MCP server 并完成一次真实任务 |

### 第 5 周：记忆与状态

| 主题 | 学习内容 | 动手任务 |
|---|---|---|
| 窗口之外的记忆 | 12 步路线图 04 步：磁盘注入 vs 消息历史、写到文件是最可靠记忆、/compact 与 /clear 的时机 | 在 DSH 里实践：长任务用 plan.md + 进度日志模式跑一次重构 |
| 事件溯源会话 | 复习 DSH 的 "Model-visible means logged"、SessionEvent 日志、fork/resume | 用轨迹面板回放一次完整会话，理解每个事件的含义 |

### 第 6 周：循环

| 主题 | 学习内容 | 动手任务 |
|---|---|---|
| 停止条件 | 12 步路线图 05 步：停止条件必须在模型判断之外、loop-until-dry、对"所有见过的"去重 | 给一个重复性任务（如批量检查笔记链接）写带停止条件的循环脚本 |
| 验证器 | 06 步：对抗式验证、视角多元验证、评审团模式 | 给上面的循环加一个独立验证器 |

### 第 7 周：图（Graph）

| 主题 | 学习内容 | 动手任务 |
|---|---|---|
| 并行拓扑 | 07–08 步：菱形模式（扇出→代码归约→综合）、parallel vs pipeline、按节点分层模型省钱 | 复习 [[05-LangGraph运行时]]，用 LangGraph 把一个串行任务改造成菱形并行 |
| 多 Agent 协作 | DSH 的 Agent Teams（DAG 依赖、任务板）、子代理扇出 | 设计一个"多角度代码审查"工作流（性能/安全/可维护性三路并行） |

**里程碑 M2**：至少 5 个真实工作任务全部经由 Agent 工作流完成（记录：任务、用时、干预次数、质量评分），形成自己的《Agent 工作流 SOP》。

---

## 四、阶段三：可靠性层（第 8–11 周）

> 目标：从"能跑"到"可信"。这是大多数人的断档处，也是拉开差距的地方。

### 第 8–9 周：Harness 工程化

| 主题 | 学习内容 | 动手任务 |
|---|---|---|
| 跨会话接力 | 12 步路线图 09 步：轮班工程师隐喻、initializer agent、JSON 功能清单（防规格篡改）、"每次会话一个增量"契约 | 为一个稍大的项目（如全栈 SaaS 练手项目）跑一次 initializer 流程：init.sh + 进度日志 + 全 false 的 feature_list.json |
| DSH 深水区 | 用 Patch 替换一个系统组件（如审批策略）；理解 Profile/Bundle/Patch 完整链路；安全红线（公网部署、供应链） | 完成 DSH 学习指南的"阶段三"任务清单 |

### 第 10–11 周：Evals 评测体系

| 主题 | 学习内容 | 动手任务 |
|---|---|---|
| 评测入门 | 12 步路线图 11 步：20–50 个真实失败任务起步、两位专家独立一致原则、三种评分器（代码/模型/人类）、评产出物不评路径 | 把你过去一个月的 Agent 任务失败案例整理成 20 个 eval 任务 |
| 评测进阶 | 12 步：transcript 审查、0% 通过率陷阱、饱和陷阱、pass@k vs pass^k、接入 CI | 为上面 20 个任务搭一个最小评测跑分脚本，跑出基线分数 |
| 可观测 | 复习 [[06-工程化与LangSmith]]：LangSmith trace / DSH 遥测；Token 成本核算 | 给日常 Agent 用量建一张仪表（成本/成功率/干预率） |

**里程碑 M3**：一份《我的 Agent 可靠性手册》——含 eval 基线分数、失败模式分类、每类的应对策略。

---

## 五、阶段四：融合层（第 12–14 周）

> 目标：毕业项目——**用 AI 增强工作流全程交付一个真实的全栈 SaaS 小产品**。约束：所有编码 ≥70% 由 Agent 完成，你负责架构决策、评审与验收。

项目形态建议（三选一，也可自定）：

1. **团队知识库问答 SaaS**——正好消化你的 Obsidian 知识库，RAG + Agent 检索，技术上接 LangChain 主线
2. **健康饮食扫描 Web 版**——health_scan 小程序的 Web 化（Next.js + Cloudflare，衔接你的全栈目标）
3. **Agent 工作流管理面板**——把 M2/M3 的 SOP 和评测仪表产品化（元项目，吃自己的狗粮）

执行要求（融合阶段一~三全部所学）：

- Day 1 用 initializer agent 搭环境：init.sh、进度日志、feature_list.json（全 false 起步）
- 每次会话一个增量：定位 → 选一个功能 → 像用户一样验证 → 干净收尾
- 每周跑一次 eval 套件，用数字决定方向调整
- 项目结束时输出：产品 + 《AI 增强开发实录》（数据：Agent 完成度、Token 成本、eval 曲线、踩坑清单）

**毕业标准**：产品可上线演示 + 实录文章可发表（你的公众号正好有产出渠道）。

---

## 六、贯穿性安排

### 日常节奏

- **每日 15 分钟**：Agent 工作流日志（今天什么任务交给了 Agent、干预几次、下次怎么少干预）
- **每周一次**：eval 套件跑分 + 失败案例归档（喂给阶段三）
- **每两周**：一篇费曼笔记发布（公众号/知识库双载体，选题优先从本周卡壳的概念里挑）

### 知识库锚点（本规划与现有笔记的映射）

| 规划主题 | 已有笔记 | 缺口（待补） |
|---|---|---|
| DSH 全貌 | [[deepseek-harness学习指南]] [[deepseek-harness实践]] | — |
| 七大支柱 | [[Agent工程师12步路线图]] | Loop/Graph/Harness 各自的专题笔记 |
| LangChain 主线 | [[00-学习大纲]]～[[07-实战项目]] | — |
| 软件工程三支柱 | （对话中讨论，未成文） | 配置管理、DI、SOLID 三篇笔记 ← **阶段一产出** |
| 上下文工程 | — | CLAUDE.md/AGENTS.md 实践笔记 ← **阶段一产出** |

### 资源清单（按优先级）

**一手资料（必读）**
- DeepSeek Harness 官方仓库 + docs/architecture.md
- Cordis 论文《A Programming Paradigm for Spatiotemporal Composability》
- @0xCodez 12 步路线图原文（threadnavigator.com/thread/2089393338977829278）
- Martin Fowler《IoC Containers and the Dependency Injection pattern》
- Anthropic Agent Skills 规范 / MCP 协议文档

**体系化课程（按需）**
- 库内 `全栈学习路线/08-AI-Agent-框架与源码/`（mini-agent-sdk 自建）
- 库内 `全栈学习路线/06-数据库与工程化/`（工程化基础）
- WaytoAGI 飞书库：Harness Engineering / Loop Engineering / Graph Engineering 系列

**实践环境**
- DSH（主力）+ Claude Code（对照）——两个 Harness 交叉使用最能建立"框架无关"的认知

---

## 七、进度追踪

- [ ] M1（第 3 周末）：三大支柱概念地图 + 项目 CLAUDE.md
- [ ] M2（第 7 周末）：5 个真实任务 Agent 化 + 工作流 SOP
- [ ] M3（第 11 周末）：20 个 eval 基线 + 可靠性手册
- [ ] 毕业（第 14 周末）：SaaS 产品 + 开发实录文章

> 使用方式：每完成一个里程碑回来勾选，并在下方追加"实际完成日期 + 偏差说明"。

---

## 附：与并行学习线的关系

- **LangChain 主线**（[[00-学习大纲]]）：继续推进，不受本规划挤占——建议节奏为本周 LangChain 2 天 + 本规划 2 天 + 项目实战 1 天
- **DSH 学习指南**（[[deepseek-harness学习指南]]）第五节的 4 阶段路线已被本规划吸收并扩展——以本规划为准
- **全栈学习路线**：阶段四毕业项目优先选衔接全栈目标的形态（Next.js + Cloudflare）
