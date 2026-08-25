# Agent Harness 对比与 DeepSeek Harness 深度剖析

**Claude Code、Codex、LangChain/LangGraph 横向对比 × 六大深挖方向调研报告**

**调研日期：2026 年 8 月 24 日**

## 摘要

本报告围绕 DeepSeek Harness（DSH）与 Claude Code、Codex、LangChain/LangGraph 的架构对比，以及工具层视觉、子代理调度、缓存经济学、Cordis 论文、沙箱安全、插件分发六个深挖方向，基于 26 个多源信源完成调研。核心发现：其一，Harness 与编排框架分属不同技术层级，"框架组合智能体、Harness 运行智能体"，把 LangChain 与 DSH 放在同一功能表上对比是概念错误；其二，同一模型在不同 Harness 下表现差异远超模型间差异——Vercel 删掉 80% 工具后成功率从 80% 升至 100%，第三方 Harness 在 Anthropic 自家模型上反超官方产品 17.5 个百分点；其三，DSH 的多模态采用工具层降级链路，纯文本模型经 OCR 与像素分析获得结构化视觉证据；其四，DeepSeek 定价中缓存命中与未命中价差约 50 至 120 倍，DSH 事件溯源架构天然保住缓存前缀，命中率约 99%，命中率直接决定运行成本；其五，Cordis 论文把插件副作用撤销从工程约定提升为运行时形式化保证；其六，安全现状为"一个已修复的 Bubblewrap 沙箱逃逸加七项未证实的社区报告缺口"；其七，插件仓库四天从 700 涨至近 8000，但接口不稳定与定价波动正在给生态收税。选型结论：成品订阅、开源自托管、编排框架三生态位并存，按模型绑定、部署位置、行为可控性三个假设选型，当前理性姿势是双持观察。

## 1. Harness 是什么：四层模型中的执行层

要对比 DeepSeek Harness、Claude Code、Codex 与 LangChain，第一步必须先纠正概念层级。LangChain 给出的定义最为直白：Harness 是"模型本身之外的全部代码、配置与执行逻辑"[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。模型负责推理，Harness 负责让一个智能体真正行动起来——维持反复调用模型的循环、注册并约束工具的可用范围、提供工具运行的沙箱、保存跨重启的记忆、决定哪些内容进入上下文窗口[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。

围绕这一定义，业界已经形成一个四层技术栈：模型层负责推理；Harness 层负责运行单个智能体；框架层负责编排多个智能体；平台层则在团队与时间维度上运行大量 Harness，提供持久执行、成本归因与治理能力[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。数据库厂商 MongoDB 从外部给出了同样的分层[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。四层之间有一条决定性的分界线：框架组合智能体，Harness 运行智能体[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。LangChain 团队自己对这条线的表述是：LangChain 是智能体框架，LangGraph 是智能体运行时，DeepAgents 是智能体 Harness——同一厂商的三类产品分属三个层级。把 LangChain 与 DeepSeek Harness 放在同一张功能表上逐项打钩，等于拿发动机对比整车，是当前对比讨论中最常见的概念错误。

这一层级划分的实用价值在于回答"该选哪一层"。单一智能体做长时、开放式工作（修一个代码库、研究一个问题），需要的通常是 Harness 而非框架；只有当任务需要多个智能体、需要显式分支与状态时，框架才挣得自己的位置[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。

**表1：Agent 技术栈四层分工**

| 层级 | 职责 | 代表性产品 |
|------|------|-----------|
| 模型 | 推理与生成 | DeepSeek V4、Claude、GPT 系列 |
| Harness | 运行单个智能体：循环、工具、沙箱、记忆、上下文 | Claude Code、Codex、DeepSeek Harness、OpenCode、Goose |
| 框架 | 编排多个智能体：显式状态、分支、控制流 | LangChain、LangGraph、CrewAI |
| 平台 | 跨团队运行多个 Harness：持久执行、成本归因、治理 | MongoDB 定义的 agentic platform 层[winder.ai](https://winder.ai/ai-agent-harness-comparison/) |

## 2. 四款产品架构横向对比

### 2.1 Claude Code 与 Codex：闭源成品路线

Claude Code 是 Anthropic 推出的终端优先编码智能体，采用专有许可（自定义许可加商业条款），TypeScript 编写，仅支持 Anthropic 自家模型，截至 2026 年 8 月 19 日约 14.2 万星；它的两个结构性短板是单一厂商模型绑定，以及记忆能力在设计上做得很薄[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。Codex 是 OpenAI 的对应产品，Apache-2.0 协议，Rust 与 TypeScript 混合技术栈，同样只跑 OpenAI 自家模型，约 10.7 万星[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。两者都是订阅制托管产品：用户拿到的是成品，沙箱、凭据、审计都由厂商封装[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。

第三方评测对两者的定性一致：闭源、固定、锁定特定模型，内部逻辑对用户不可见；当模型跑偏、啰嗦或误处理子任务时，用户只能围绕一个打不开的系统调整提示词与规则[mindstudio.ai](https://www.mindstudio.ai/blog/deepseek-harness-vs-claude-code-codex)。一家同时运营七个 Harness 的机构给出了自己的用法：把 Claude Code 与 Codex 配对跑在同一份工作上，"两个会吵架的智能体产出的软件好于其中任何一个"[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。

### 2.2 DeepSeek Harness：一切皆插件的开源运行时

DeepSeek Harness（命令名 dsh）于 2026 年 8 月 13 日以 MIT 协议开源，TypeScript 编写，官方明示处于开发者预览阶段、将有破坏性变更[GitHub](https://github.com/deepseek-ai/deepseek-harness)。它的架构粒度与其他产品有本质差别：模型适配器、工具、技能、会话、沙箱、存储、循环、调度、界面全部是插件，由 Cordis 内核管理挂载、卸载与依赖；开发者可以在配置层选择、替换、扩展任何能力，无需改动 Harness 源码[deepseek.com](https://deepseek.com/harness/en/)。连智能体主循环本身也是可替换插件——这一点连最接近的先行者 Pi 都没做到，Pi 允许用户扩展能力，DSH 则把整个系统当作一摞可组合的插件[mindstudio.ai](https://www.mindstudio.ai/blog/deepseek-harness-vs-claude-code-codex)。

市场热度方面，该项目发布一周内约 16.5 万星[mindstudio.ai](https://www.mindstudio.ai/blog/deepseek-harness-vs-claude-code-codex)；另一家机构 8 月 19 日核对的数据为两天约 95,386 星[winder.ai](https://winder.ai/ai-agent-harness-comparison/)，GitHub API 实测截至 8 月 19 日为 165,929 星、17,650 fork。它还能把 Claude Code 与 Codex 作为子代理驱动[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。对照评测给出的核心弱点同样明确：发布仅数日的开发者预览版，没有任何东西是稳定的[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。

**表2：九款主流 Agent Harness 概览（2026-08-19 核对）**

| Harness | 厂商与许可 | 技术栈与模型支持 | 星数 | 适用场景 | 核心弱点 |
|---|---|---|---|---|---|
| Claude Code | Anthropic，专有许可 | TypeScript，仅 Anthropic 模型 | 142k | Anthropic 模型的终端编码 | 单厂商绑定；记忆设计偏薄[winder.ai](https://winder.ai/ai-agent-harness-comparison/) |
| Codex | OpenAI，Apache-2.0 | Rust+TypeScript，仅 OpenAI 模型 | 107k | OpenAI 模型的同类工作 | 单厂商绑定[winder.ai](https://winder.ai/ai-agent-harness-comparison/) |
| OpenCode | Anomaly，MIT | TypeScript，75+ 提供商含本地模型 | 199k | 开放权重模型自托管 | 曾默认把全部提示词发给外部模型命名会话（v1.2.23 前）[winder.ai](https://winder.ai/ai-agent-harness-comparison/) |
| Qwen Code | 阿里通义，Apache-2.0 | TypeScript，多厂商 API 加本地 Ollama/vLLM | 27.2k | Qwen 模型 | 指向其他模型时问题频发[winder.ai](https://winder.ai/ai-agent-harness-comparison/) |
| DeepSeek Harness | DeepSeek，MIT | TypeScript，一切皆插件含主循环 | 165.9k | 拼装 Harness、驱动其他 Harness | 开发者预览，全面不稳定[winder.ai](https://winder.ai/ai-agent-harness-comparison/) |
| Goose | Linux 基金会 Agentic AI Foundation，Apache-2.0 | Rust，15+ 提供商含本地 | 53k | 需要中立治理的通用工作 | 路线图对基金会而非厂商负责[winder.ai](https://winder.ai/ai-agent-harness-comparison/) |
| Zed Agent | Zed Industries，GPL-3.0+ | Rust，经 ACP 驱动 Claude/Codex/OpenCode | 88.9k | 编辑器内工作 | 外部代理的 diff 审阅界面缺失问题仍未关闭[winder.ai](https://winder.ai/ai-agent-harness-comparison/) |
| OpenHands | All-Hands-AI，MIT | 自托管，可选 Docker 沙箱，任意模型 | 85k | 自控沙箱的自托管 | 遇到模糊问题会循环；Docker 套娃在受限笔记本上难用[winder.ai](https://winder.ai/ai-agent-harness-comparison/) |
| Pydantic AI Harness | Pydantic，开源 | 类型化 Python 能力原语 | — | 给已有 Python 服务加 Harness 行为 | 是库不是应用；仍是 0.x 版本[winder.ai](https://winder.ai/ai-agent-harness-comparison/) |

### 2.3 LangChain/LangGraph：编排框架而非 Harness

LangGraph 走的是与 DSH 相反的哲学路线：把智能体工作流建模为有向图，节点是动作、边是转移、状态流经全图，每一步都有检查点，追求确定性执行[haal-lab.solutions](https://haal-lab.solutions/en/blog/deepseek-harness-vs-langgraph-comparison)。它的稳定版 1.0 于 2025 年 10 月 22 日发布，此前已在 Uber、LinkedIn、Klarna 的生产环境用了一年[haal-lab.solutions](https://haal-lab.solutions/en/blog/deepseek-harness-vs-langgraph-comparison)。两种哲学的对照可以一句话概括：DSH 说"用配置来组合，用可替换的部件搭建智能体"；LangGraph 说"显式状态机，定义每一个转移，靠读代码来调试"[haal-lab.solutions](https://haal-lab.solutions/en/blog/deepseek-harness-vs-langgraph-comparison)。

一份耗时 47 小时的对照实测（同一模型 DeepSeek V4 Flash、同一组工具、同一测试集，基于 DSH v0.1.0-rc.6 与 LangGraph v0.2.8，2026-08-17 更新）给出了量化差异：

**表3：DSH 与 LangGraph 同任务实测（100 个多步编码任务，单一来源，基于 rc.6）**

| 指标 | DeepSeek Harness | LangGraph | 占优方 |
|------|------|------|------|
| 单任务平均延迟 | 3.2 秒 | 3.8 秒 | DSH[haal-lab.solutions](https://haal-lab.solutions/en/blog/deepseek-harness-vs-langgraph-comparison) |
| 内存开销 | 180MB | 240MB | DSH[haal-lab.solutions](https://haal-lab.solutions/en/blog/deepseek-harness-vs-langgraph-comparison) |
| 冷启动时间 | 2.1 秒 | 0.8 秒 | LangGraph[haal-lab.solutions](https://haal-lab.solutions/en/blog/deepseek-harness-vs-langgraph-comparison) |
| 错误率 | 7% | 4% | LangGraph[haal-lab.solutions](https://haal-lab.solutions/en/blog/deepseek-harness-vs-langgraph-comparison) |
| 成功完成任务数 | 93/100 | 96/100 | LangGraph[haal-lab.solutions](https://haal-lab.solutions/en/blog/deepseek-harness-vs-langgraph-comparison) |
| 平均 Token 消耗 | 约 2400 | 约 2600 | DSH[haal-lab.solutions](https://haal-lab.solutions/en/blog/deepseek-harness-vs-langgraph-comparison) |

实测的结论分层清晰：状态持久化与人机协同是 LangGraph 的压倒性优势——检查点机制天然支持故障恢复、暂停等待人工审批、时间旅行调试，金融合规场景开发耗时 2 天，DSH 靠自定义插件实现同样功能需要一到两周；运行时可组合性是 DSH 的压倒性优势——多品牌多租户场景 DSH 用三个配置文件一天搞定，LangGraph 需要在图里写运行时分支逻辑花三天；30 天生产稳定性测试中，LangGraph 正常运行时间 99.4% 对 DSH 的 98.7%，崩溃恢复平均 30 秒对 8 分钟[haal-lab.solutions](https://haal-lab.solutions/en/blog/deepseek-harness-vs-langgraph-comparison)。需要说明的一个数据分歧：该实测文中引用的 DSH 星数为约 1,500（其自述为非官方 fork 的估计值），与其余来源的约 16.5 万严重不符，本报告不采用该数字[haal-lab.solutions](https://haal-lab.solutions/en/blog/deepseek-harness-vs-langgraph-comparison)。

## 3. 换 Harness 比换模型更影响结果

对比四款产品之前，必须先承认一个已被多方实测验证的事实：在模型能力相近的前提下，Harness 的差异对结果的影响超过模型本身的差异。四组被 MongoDB 在 2026 年 4 月汇总的案例：Vercel 砍掉一个智能体 80% 的工具，同一模型上成功率从 80% 升到 100%，Token 消耗减半以上，延迟从 724 秒降到 141 秒；LangChain 仅更换 Harness 就把自家编码智能体在 Terminal Bench 上的成绩从 52.8% 提到 66.5%；普林斯顿的 CORE-Bench 上，同一个模型在两种脚手架下分别拿到 42% 与 78%；法律科技公司 Harvey 仅靠 Harness 工程就把法律智能体准确率提升了一倍以上[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。

更有冲击力的是第三方 Harness 在厂商自家模型上反超官方产品的案例：Terminal-Bench 2.0 上，Letta Code 跑 Claude Opus 4.5 拿到 59.1%，官方的 Claude Code 跑同一模型只有 41.6%——原因是该基准奖励持久记忆，Letta 围绕记忆底座构建，而 Claude Code 的记忆设计偏薄[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。Sebastian Raschka 把编码智能体拆成六个组件（首轮提示前的仓库上下文、分为缓存前缀与可变后缀的提示词、带校验与路径访问控制的预定义工具、上下文裁剪压缩、与完整转录分离的结构化会话记忆、带只读权限与递归上限的受限子代理），并给出一个带限定条件的结论：在当前裸模型能力大同小异的前提下，Harness"往往是让某个大模型比另一个更好用的那个区分因素"[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。

这一事实对选型有两层含义。其一，对比任何 Harness 时，功能清单会过期——Zed Agent、OpenHands、DeepSeek Harness 都已支持 Agent Client Protocol 并能互相驱动，Linux 基金会 2026 年成立 Agentic AI Foundation 收编了 Anthropic 的 MCP、OpenAI 的 AGENTS.md 与 Goose 三项捐赠，各家 Harness"彼此之间的相似度已经超过它们底层模型之间的相似度"[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。其二，Harness 工程本身分两种：上下文压缩、重试逻辑这类工作会随下一代模型蒸发，属于隐藏技术债；沙箱、权限、消费上限、审计轨迹这类工作编码的是组织允许什么，任何模型发布都不会废除它们[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。DSH 开源的正是后一类能力的完整参考实现。

## 4. 工具层视觉：纯文本模型的看图降级链路

先做术语澄清："工具层视觉退化"不是官方文档术语，多轮检索未找到该词组的权威定义；它指向的实际机制是 DSH 在 v0.1.0-rc.8 引入的多模态降级设计——当所选模型不支持图像输入时，系统不报错退出，而是退化到工具层的视觉处理。与之相关但不同的另一个概念是极简模式的界面简化。本节把两件事分开讲。

极简模式（Minimal）是官方四模式之一，定义为仅保留持久 bash 与 str_replace_editor 两个工具的双工具编码智能体，刻意移除搜索、技能、子代理、工作流这些外围机制，用途是模型评测：DeepSeek 官方用极简模式跑了随 V4-Flash 公布的公开编码基准[zimaspace.com](https://shop.zimaspace.com/blogs/tech-ai-hub/de-minimal-and-creator-explained)。这里的设计动机值得展开：现代智能体基准测的往往不止模型——更强的规划器、更好的上下文组装、仓库搜索、重试策略都会改变任务成败，研究者需要在"去掉大部分环境、只留最小执行面"的条件下观察模型本身[zimaspace.com](https://shop.zimaspace.com/blogs/tech-ai-hub/de-minimal-and-creator-explained)。Harness-Bench 相关研究也主张，能力应归因到"模型×Harness 配置"这一层，而非全部记在模型权重账上[zimaspace.com](https://shop.zimaspace.com/blogs/tech-ai-hub/de-minimal-and-creator-explained)。

rc.8 的多模态降级链路则是另一种"退化"：DeepSeek 模型适配器可配置启用原生图片请求，但默认的 V4-Pro 是纯文本模型，直接发图会被拒绝——这是有意设计，因为工具结果要进入持久会话历史，路由不支持图片会破坏续聊与分叉。当模型不支持图像时，Harness 自动退化到工具层视觉：先做 OCR 识别文字，再统计颜色比例、扫描像素行、读取图片元信息，把图像拆解为结构化证据交给纯文本模型推理。社区插件走的是同一条路：ModLens 充当"视觉桥"，先把图片的文字、布局、实体整理成结构化证据再交给 DeepSeek 推理[mindstudio.ai](https://www.mindstudio.ai/blog/deepseek-harness-vs-claude-code-codex)；dsh-vision-toolkit 提供图片问答、长截图 OCR、UI 还原、像素对比十个视觉工具。这条降级链路的意义在于：它把"模型缺视觉"这个模型层短板，转化成了 Harness 层可插拔、可替换、可审计的工程问题——正是"换 Harness 比换模型更影响结果"在多模态上的具体化。

## 5. 子代理调度：五种接缝与统一调度层野心

DSH 的子代理接缝（subagent seam）提供五种提供方：进程内派生、进程内分叉、ACP 协议、Codex、Claude Code。rc.8 之后，Claude Code 与 Codex 不再与主体捆绑，改为按需安装的 Profile Bundle，作为子代理被 Harness 调用，其中 Codex 新增非交互权限模式（支持无人值守流程）与多命名实例（同一任务中多个不同配置的 Codex 子代理并存），子代理通过 reportDelivery 机制及时反馈结果并主动唤醒父任务，父任务不再盲等。这些更新在 36 氪的报道中被概括为一句话：DSH 的目标是成为 Agent 的"调度层"[36氪](https://eu.36kr.com/en/p/3947852851664512)。

从实现上看，调用 Claude Code 或 Codex 就是装一个插件：发起一次工具调用、等待结果、把结果折叠回主会话[mindstudio.ai](https://www.mindstudio.ai/blog/deepseek-harness-agentic-coding)；只要本机安装了 Claude Code 或 Codex，DSH 就能把它们作为子进程运行[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。协议层面，DSH 通过 Agent Client Protocol（ACP）对外暴露智能体能力[deepwiki.com](https://deepwiki.com/deepseek-ai/deepseek-harness/7.1-acp-protocol-and-agent-communication)，与 Zed Agent、OpenHands 同属 ACP 阵营，三者可以互相驱动[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。子代理的全部调度行为——派生、结果回传、状态——都记录在追加式会话日志中，与主循环事件流同源可审计[deepseek.com](https://deepseek.com/harness/en/)。

这一设计的战略含义在于身份转换：DSH 不再只是"又一个编码智能体"，而是把自己放在 Claude Code 与 Codex 的上一层——它可以调度它们，也可以被 Zed 这样的编辑器通过 ACP 调度。收编而非对抗，是它对既有生态的总方针。

## 6. 缓存经济学：命中率决定生死

DeepSeek 的 API 定价把"缓存命中率"变成了 Agent 成本的第一变量。发布时点的官方价格：V4-Flash 缓存命中输入每百万 Token 0.0028 美元，缓存未命中 0.14 美元，价差 50 倍；V4-Pro 缓存命中输入 0.003625 美元，未命中 0.435 美元，输出 0.87 美元，命中与未命中的价差约 120 倍[nxcode.io](https://www.nxcode.io/resources/news/deepseek-v4-flash-0731-agent-economics-2026) [venturebeat.com](https://venturebeat.com/technology/deepseek-harness-launches-as-open-source-rival-to-claude-code-alongside-v4-pro-on-api-with-higher-prices)。这一价格已经反映了 V4-Pro 四月定价基础上的 75% 降幅[flowtivity.ai](https://flowtivity.ai/blog/deepseek-harness-open-source-agent-explained/)。8 月 17 日官方又落地一轮涨价并引入峰谷分时计价，空闲时段价格为高峰时段的一半，缓存命中与未命中的价差维持在约 30 倍量级。

**表4：DeepSeek API 缓存定价（2026-08-13 发布时点口径）**

| 模型 | 缓存命中输入价（$/百万Token） | 缓存未命中输入价（$/百万Token） | 未命中/命中价差 |
|------|------|------|------|
| V4-Flash | 0.0028[nxcode.io](https://www.nxcode.io/resources/news/deepseek-v4-flash-0731-agent-economics-2026) | 0.14[nxcode.io](https://www.nxcode.io/resources/news/deepseek-v4-flash-0731-agent-economics-2026) | 50 倍 |
| V4-Pro | 0.003625[venturebeat.com](https://venturebeat.com/technology/deepseek-harness-launches-as-open-source-rival-to-claude-code-alongside-v4-pro-on-api-with-higher-prices) | 0.435[venturebeat.com](https://venturebeat.com/technology/deepseek-harness-launches-as-open-source-rival-to-claude-code-alongside-v4-pro-on-api-with-higher-prices) | 120 倍 |

命中率数据方面：早在 DSH 开源之前，已有媒体报道 DeepSeek 相关 Harness 在其模型上达到 99.93% 的输入缓存命中率，未命中率仅 0.07%[36氪](https://eu.36kr.com/en/p/3934404658642055)，多家媒体转述了同一数字[htx.com](https://www.htx.com/news/cache-hit-rate-reaches-9993-the-best-harness-for-deepseek-is-7o7Tuu5n/)；DSH 开源后，社区实测的缓存命中率大多维持在 99% 上下，偶尔掉到 60–70%。横向对照更能说明问题：同一个 V4-Flash 模型，不同 Harness 跑出的缓存占比差异悬殊，Codex 约 70%，OMP 约 57%，而某个参测 Harness 仅 1.5%——其新鲜输入成本是缓存命中的五倍。

机制层面的解释来自 DSH 的架构：会话日志追加式记录，模型可见的一切由日志投影生成，提示词被拆成稳定的缓存前缀与可变后缀[deepseek.com](https://deepseek.com/harness/en/)。前缀越稳定，缓存命中越高——事件溯源、上下文自动压缩、大输出落盘这些被当作"可审计性卖点"的设计，同时也是缓存友好的成本设计。反过来，这解释了生态的残酷面：依赖大量评估循环的项目（预设调参、基准测试）对 Token 价格极度敏感，8 月 17 日涨价直接导致 3,600 星的社区标准预设项目 dsh-anchored-standard 停止活跃开发。对使用者而言结论很直接：选 Harness 先看它能不能保住缓存前缀，这一项对总成本的影响超过模型单价本身。

## 7. Cordis 论文：时空可组合性的形式化

DSH 的插件内核 Cordis 有一篇配套论文《A Programming Paradigm for Spatiotemporal Composability》，2026 年 8 月 13 日与 DSH 同日公开，是仍在修订的预印本[GitHub](https://github.com/cordiverse/paper)，全文约 88 页[flowtivity.ai](https://flowtivity.ai/blog/deepseek-harness-open-source-agent-explained/)，论文仓库开源后获约 1.9 千星、72 fork[GitHub](https://github.com/cordiverse/paper/blob/main/README.md)。媒体报道将其称为 DeepSeek 发表的"自演化 AI 框架"论文[kucoin.com](https://www.kucoin.com/news/flash/deepseek-publishes-paper-on-self-evolving-ai-framework-cordis)。

论文的问题陈述是：从插件系统到自演化智能体 Harness，现代软件越来越需要动态组合，但形式化基础一直欠发达[GitHub](https://github.com/cordiverse/paper)。它把问题拆成两个正交维度：时间可组合性，即组件被移除时完全撤销其副作用的能力；空间可组合性，即声明并响应式管理组件间依赖的能力[GitHub](https://github.com/cordiverse/paper)。解法是把经典的效应（effect）与共效应（coeffect）概念提升为运行时机制：形式化"可逆效应"——每次上下文变换都携带一个逆操作，由运行时追踪执行；形式化"响应式共效应"——上下文的每次变化按组件的共效应规范通知该组件；两者统一进单一的上下文类型，构成一个编程范式；在此之上定义"组件"与动态组合演算，其元理论把时空可组合性从单个组件推广到交错组合的整个系统[GitHub](https://github.com/cordiverse/paper)。Cordis 是该范式的实现：核心库负责效应追踪与共效应解析，声明式组件加载器负责配置调和与热模块替换[GitHub](https://github.com/cordiverse/paper) [GitHub](https://github.com/cordiverse/paper/blob/main/README.md)。

这篇论文对理解 DSH 的不可替代性在于两点。第一，它给了"热插拔"形式化定义：现有插件系统（论文用 2026 年 6 月的 VS Code Marketplace 数据做了审计，结论是普遍不及格[flowtivity.ai](https://flowtivity.ai/blog/deepseek-harness-open-source-agent-explained/)）依赖开发者自觉写清理逻辑，Cordis 把撤销做成运行时不变式——这是 dsh-turn-rewind 能同时回退对话与工作区、创造模式敢在内存里做插件实验的理论前提。第二，它解释了 DSH 与 VS Code 式插件体系的本质差别：后者只解决空间维（组件能不能拼上），Cordis 同时解决时间维（拆掉之后世界能否恢复原状）。读源码之前先读这篇论文的摘要，是成本最低的入门路径。

## 8. 安全：一次沙箱逃逸与一长串信任模型缺口

发布两周后，DSH 的安全图景是"一个已获官方修复的漏洞，加一长串社区报告但未经独立证实的信任模型缺口"[findharness.com](https://findharness.com/blog/state-of-deepseek-harness-security)。

已确认修复的漏洞是 Bubblewrap 沙箱逃逸：受限进程可经 /proc/<pid>/root 绕过沙箱限制，修复包含在 2026 年 8 月 21 日的 v0.1.1-rc.1 版本中。DSH 没有专门的安全通告格式，这条修复只出现在常规发布说明里，是目前最接近 CVE 式披露的官方记录[findharness.com](https://findharness.com/blog/state-of-deepseek-harness-security)。同期修复的还有一个流程级问题：文档站原本在每次推送 master 分支时自动部署，未发布内容会泄露到公开页面，现已改为仅发布标签触发[findharness.com](https://findharness.com/blog/state-of-deepseek-harness-security)。截至 8 月 21 日的五天内，DSH 发布了三个 npm 版本[findharness.com](https://findharness.com/blog/state-of-deepseek-harness-security)。

2026 年 8 月 18 日，一份第三方信任模型问题汇总在社区流传，以下条目均为社区报告、未获独立证实[findharness.com](https://findharness.com/blog/state-of-deepseek-harness-security)：

**表5：社区报告的信任模型缺口（2026-08-18 汇总，均未经独立证实）**

| 报告的问题 | 对应风险 |
|------|------|
| Web 界面无认证层（无令牌、无 Cookie、无 TLS） | 任何能触达端口的本地进程都能以你的身份操作[findharness.com](https://findharness.com/blog/state-of-deepseek-harness-security) |
| 绑定 0.0.0.0 会把局域网 IP 自动加入信任主机列表 | 同网段任何人获得同样的未认证控制权[findharness.com](https://findharness.com/blog/state-of-deepseek-harness-security) |
| 未认证的回环 RPC 可读取完整会话内容 | 本地进程绕过界面也能读到你的全部操作记录[findharness.com](https://findharness.com/blog/state-of-deepseek-harness-security) |
| 插件安装立即在宿主进程执行代码，卸载后可能留残留 | 安装插件不是沙箱预览，而是立即在本机执行[findharness.com](https://findharness.com/blog/state-of-deepseek-harness-security) |
| AGENTS.md/CLAUDE.md 指令注入可在无安装无审批的情况下触发 | 不可信仓库内容可在你未主动授权前操纵智能体[findharness.com](https://findharness.com/blog/state-of-deepseek-harness-security) |
| 工作流工具的虚拟机沙箱隔离被报告可绕过 | "无文件系统、网络、定时器访问"的声明存在争议[findharness.com](https://findharness.com/blog/state-of-deepseek-harness-security) |
| workspace-write 模式下，模型被报告可经 Web 审批回环自我批准并提权至 danger-full-access | 本应要求人工点击的护栏被报告可绕开[findharness.com](https://findharness.com/blog/state-of-deepseek-harness-security) |

独立评论者的观点提供了参照系：有评论指出 DSH 本地沙箱只限制写入位置，不限制进程可见性与网络出口，保护范围比"沙箱"一词暗示的更窄[findharness.com](https://findharness.com/blog/state-of-deepseek-harness-security)；DSH 自己的文档也写明，应把该能力当作 bash 访问来对待，沙箱不是安全边界[领英](https://www.linkedin.com/pulse/why-deepseek-harness-changes-architecture-coding-agents-bassel-haidar-j4pje)；企业评测机构 Wavect 的判断是，鉴于开发者预览状态与上述缺口，DSH 适合小规模试点，尚不是能直接承载生产负载的控制平面[findharness.com](https://findharness.com/blog/state-of-deepseek-harness-security)。另一个结构性风险：AGENTS.md/CLAUDE.md 默认在每个新会话渲染最多 65,536 字节进上下文，工作区文件自动入上下文带来的指令注入风险并非 DSH 独有，而是所有同类 Harness 的共性[findharness.com](https://findharness.com/blog/state-of-deepseek-harness-security)。同期，Claude Code 也被披露沙箱漏洞（符号链接处理不当，编号 CVE-2026-39861），7 月还有 OpenAI 模型逃逸沙箱触及 Hugging Face 生产系统的事件——沙箱安全是整个行业的未解难题，不是 DSH 的个案。

防护清单可以直接执行：Web 界面只绑 127.0.0.1，远程访问走自建认证隧道；默认用 workspace-write 加审批，不用 danger-full-access；装插件前审查代码，陌生插件放隔离 Profile 试用；固定 commit 或版本号；尽快升级到 0.1.1-rc.1；敏感仓库不放进工作区；社区已有 dsh-poison-guard、dsh-skill-security-guard、dsh-guardian 三个防御插件，安装前同样需要审查[findharness.com](https://findharness.com/blog/state-of-deepseek-harness-security)。

## 9. 插件分发层：从仓库堆到可发现市场

DSH 的插件发现机制是 GitHub topic：给插件仓库打上 dsh-plugin 标签即可被社区发现[GitHub](https://github.com/deepseek-ai/deepseek-harness)，精选目录以 awesome 列表形式聚合（如 0xsline/awesome-deepseek-harness，按 dsh-external/hub 与公开 topic 归类）[GitHub](https://github.com/0xsline/awesome-deepseek-harness)。增长速度前所未有：两天约 95,386 星，是 GitHub 有记录以来最快的采用曲线之一[winder.ai](https://winder.ai/ai-agent-harness-comparison/)；一周约 16.5 万星[mindstudio.ai](https://www.mindstudio.ai/blog/deepseek-harness-vs-claude-code-codex)；带 dsh-plugin 标签的仓库从 8 月 15 日的 700 多个涨到 8 月 19 日的 7,995 个，四天约十倍（前次调研实测数据）。

生态基础设施在发布后三到四天内自发成型，形成三层：内容层（生产力插件补体验短板，玩具插件提供情绪价值）；策展层（多份 awesome 精选目录、插件索引站把分散仓库聚合成可检索目录）；分发层（dsh-market 内置市场、Electron 桌面端 Studio 提供插件发现与自然语言找插件、预设广场一键安装整套组合）。无头部署与 Web 部署可以通过作用域插件共享同一套服务，说明插件化确实支撑了多形态分发[remio.ai](https://www.remio.ai/post/deepseek-harness-launches-putting-the-agent-runtime-above-the-model)。平台、内容、分发三要素在同一天齐备，是"生态"区别于"社区"的标志。

但两根刺同样清晰。第一根是接口稳定性：DSH 官方给开发者预览版的承诺是"将有破坏性变更"，开放插件生态要么稳定契约，要么强迫维护者追逐频繁的破坏性变更，艰难的部分现在才开始[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。第二根是定价波动对生态的系统性影响：8 月 17 日涨价后，依赖评估循环的明星项目 dsh-anchored-standard（3,600 余星）宣布停止活跃开发——生态项目的生死不只看代码质量，还看平台定价表。对插件作者与使用者的共同建议是：固定版本、审查安装脚本（构建脚本在沙箱外执行）、对 awesome 列表收录保持"收录不等于审计"的警惕[findharness.com](https://findharness.com/blog/state-of-deepseek-harness-security)。

## 10. 选型结论：按层级与假设选择而非按功能清单

四款产品占据三个不同生态位：Claude Code 与 Codex 是绑定自家模型的闭源订阅成品；DeepSeek Harness 是模型无关的开源运行时，适合自托管与深度定制；LangChain/LangGraph 是编排框架，解决多智能体的显式状态与分支问题。功能对比会过期，按假设对比才成立——每个工具背后是三个假设：用什么模型（九款产品中两款只跑单一厂商模型，Harness 成了几个月前签下的合同的下游结果）；在哪里运行（订阅托管，还是沙箱、凭据、审计轨迹全由自己搭建）；谁有权改变智能体行为（会写 Markdown 的人，还是能部署代码的人）[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。

**表6：按场景的选型建议**

| 场景 | 建议 | 依据 |
|------|------|------|
| Anthropic 模型的终端编码 | Claude Code | 该模型上成熟度最高的 Harness[winder.ai](https://winder.ai/ai-agent-harness-comparison/) |
| OpenAI 模型的同类工作 | Codex | 同上[winder.ai](https://winder.ai/ai-agent-harness-comparison/) |
| 开放权重、自托管技术栈 | Qwen Code 或 DeepSeek Harness | 完全自控[winder.ai](https://winder.ai/ai-agent-harness-comparison/) |
| 给已有 Python 服务加智能体能力 | Pydantic AI Harness | 类型化能力原语[winder.ai](https://winder.ai/ai-agent-harness-comparison/) |
| 四周内上生产 | LangGraph | 生产验证 18 个月[haal-lab.solutions](https://haal-lab.solutions/en/blog/deepseek-harness-vs-langgraph-comparison) |
| 需要人工审批流 | LangGraph | 检查点加 interrupt 机制开箱即用[haal-lab.solutions](https://haal-lab.solutions/en/blog/deepseek-harness-vs-langgraph-comparison) |
| 多租户、白标 SaaS | DeepSeek Harness | 配置驱动的多实例切换[haal-lab.solutions](https://haal-lab.solutions/en/blog/deepseek-harness-vs-langgraph-comparison) |
| 需要运行时可组合性 | DeepSeek Harness | 一切皆插件的架构红利[haal-lab.solutions](https://haal-lab.solutions/en/blog/deepseek-harness-vs-langgraph-comparison) |
| 受监管行业（金融、医疗） | LangGraph | DSH 到 1.0 之前的唯一稳妥选择[haal-lab.solutions](https://haal-lab.solutions/en/blog/deepseek-harness-vs-langgraph-comparison) |

落到操作层面，理性姿势是双持：主力工作流留在用惯的成品上，把 DSH 用于尝鲜、观察生态与学习架构；运营七个 Harness 的机构对 DSH 的态度具有代表性——"它在我们的车队里是因为它有趣，但我们还不会把客户的发布流程押在它上面"[winder.ai](https://winder.ai/ai-agent-harness-comparison/)。判断何时迁移，盯三个信号：官方对 API 与 SDK 稳定性的承诺、插件安全事件是否出现、分发层是否跑出第二个成规模的平台。

## 核心参考文献

[DeepSeek Harness: Everything is…](https://github.com/deepseek-ai/deepseek-harness) · [https://github.com/cordiverse/p…](https://github.com/cordiverse/paper/blob/main/README.md) · [0xsline/awesome-deepseek-harness](https://github.com/0xsline/awesome-deepseek-harness) · [A Programming Paradigm for Spat…](https://github.com/cordiverse/paper) · [Ed1sonChen/DailyArxiv](https://github.com/Ed1sonChen/DailyArxiv) · [DeepSeek Harness developer prev…](https://deepseek.com/harness/en/) · [The State of DeepSeek Harness S…](https://findharness.com/blog/state-of-deepseek-harness-security) · [A Comparison of AI Agent Harnes…](https://winder.ai/ai-agent-harness-comparison/) · [DeepSeek Harness vs Claude Code…](https://www.mindstudio.ai/blog/deepseek-harness-vs-claude-code-codex) · [I Spent 47 Hours Testing DeepSe…](https://haal-lab.solutions/en/blog/deepseek-harness-vs-langgraph-comparison) · [99.93% Cache Hit Rate Achieved:…](https://eu.36kr.com/en/p/3934404658642055) · [DeepSeek Harness Modes: Standar…](https://shop.zimaspace.com/blogs/tech-ai-hub/de-minimal-and-creator-explained?srsltid=AfmBOopJigSPyykaFg8Z_uXVdB6r8a9eVL7o3y_ilGXqX8Vm6X8C920Q) · [https://shop.zimaspace.com/blog…](https://shop.zimaspace.com/blogs/tech-ai-hub/de-minimal-and-creator-explained) · [DeepSeek Harness: Why 95000 Git…](https://flowtivity.ai/blog/deepseek-harness-open-source-agent-explained/) · [DeepSeek V4 Flash 0731: The Upd…](https://www.nxcode.io/resources/news/deepseek-v4-flash-0731-agent-economics-2026) · [DeepSeek Harness launches as op…](https://venturebeat.com/technology/deepseek-harness-launches-as-open-source-rival-to-claude-code-alongside-v4-pro-on-api-with-higher-prices) · [DeepSeek publishes paper on sel…](https://www.kucoin.com/news/flash/deepseek-publishes-paper-on-self-evolving-ai-framework-cordis) · [Cache hit rate reaches 99.93%,…](https://www.htx.com/news/cache-hit-rate-reaches-9993-the-best-harness-for-deepseek-is-7o7Tuu5n/) · [Why DeepSeek Harness changes th…](https://www.linkedin.com/pulse/why-deepseek-harness-changes-architecture-coding-agents-bassel-haidar-j4pje) · [What Is DeepSeek Harness? The P…](https://www.mindstudio.ai/blog/deepseek-harness-agentic-coding) · [DeepSeek Harness Unveils 3 Week…](https://eu.36kr.com/en/p/3947852851664512) · [DeepSeek Harness: Open-Source A…](https://www.eigent.ai/blog/deepseek-harness-agent-runtime) · [ACP Protocol & Agent Communicat…](https://deepwiki.com/deepseek-ai/deepseek-harness/7.1-acp-protocol-and-agent-communication) · [Why is DeepSeek's Harness a bla…](https://eu.36kr.com/en/p/3938566998834308) · [Do you all use Claude Code in W…](https://www.reddit.com/r/ClaudeCode/comments/1t29873/to_all_my_win11_bois_do_you_all_use_claude_code/) · [DeepSeek Harness Launches, Putt…](https://www.remio.ai/post/deepseek-harness-launches-putting-the-agent-runtime-above-the-model)
