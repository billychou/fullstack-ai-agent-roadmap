---
title: DeepSeek 昨晚开源 Agent Harness：一切皆插件，24 小时 3.5 万 Star
date: 2026-08-14
tags: [DeepSeek, AI Agent, Harness, 开源, Cordis]
---

# DeepSeek 昨晚开源 Agent Harness：一切皆插件，24 小时 3.5 万 Star

> 一句话摘要：DeepSeek 正式开源了自己的智能体框架 DeepSeek Harness（简称 `dsh`），主打"一切皆插件"。上线不到 24 小时，GitHub Star 数突破 3.5 万，直接冲上 Hacker News 热榜第一。这篇文章带你 10 分钟看懂它是什么、凭什么火、以及怎么上手。

---

## 🚀 昨晚发生了什么

北京时间 8 月 13 日晚，DeepSeek 悄悄开源了一个新项目：**DeepSeek Harness**。

没有发布会，没有长文预告，就是一个 GitHub 仓库 + 一个官网页面。但社区的反应非常诚实：

- ⭐ **上线不到 24 小时，Star 数突破 35,000**，Fork 超过 2700
- 📄 **MIT 协议开源**，TypeScript 编写，商用无忧
- 🔥 相关帖子冲上 **Hacker News 热榜第一**，400+ 点赞、近 200 条评论
- 📦 仓库当天就出现了社区维护的插件生态合集（awesome-deepseek-harness）

它的 slogan 只有三个词：**Everything is a Plugin（一切皆插件）**。

---

## 🤔 先搞懂：什么是 Harness

很多人第一反应是：Harness 是什么新词？

官方给出的公式非常直白：

> **Agent = Model + Harness**

**模型是智能体的灵魂，而 Harness 是让灵魂在真实世界里干活的躯壳。**

模型负责"想"，但光会想没用——它得能读你的代码、改你的文件、执行命令、记住上下文、在出错时恢复，还要接受你的审批和监管。这一整套"让模型落地干活"的工程设施，就是 Harness。

你熟悉的 Claude Code、Codex CLI、OpenCode，本质上都是 Harness。这个赛道在 2025 年之后已经卷成红海，而 DeepSeek 作为模型厂商亲自下场开源自家 Harness，意义不一般：

**模型厂商最懂自家模型怎么"用"才顺手。** 官方 Harness + 官方模型的组合，理论上能把推理、工具调用、上下文管理的配合打磨到极致。

---

## 💡 核心理念一：一切皆插件

DeepSeek Harness 最大的卖点，是把"插件化"做到了丧心病狂的程度。

传统的 Agent 框架里，模型适配、工具系统、会话管理这些核心模块往往写死在代码里，想换就得改源码。而 dsh 的做法是：

> **模型、工具、技能、会话、沙箱、存储、循环、调度、甚至 UI——全部是插件。**

这些插件跑在一个叫 **Cordis** 的内核之上。Cordis 负责插件的挂载、卸载和依赖管理，DeepSeek 还为它发了一篇正儿八经的论文：《A Programming Paradigm for Spatiotemporal Composability》（时空可组合性编程范式）。

名字很唬人，但落到工程上就是三件实在事：

**1️⃣ 没有特权核心。** 连 Agent 循环本身都是插件。不存在"必须改源码才能动"的地方。

**2️⃣ 纯配置组装。** 一个运行的 dsh 就是一棵启动时按顺序组装起来的插件树。你想换掉某个能力，写一行配置覆盖它就行，不用 fork 源码。

**3️⃣ 插件可以热插拔。** 注册即生效，卸载即回滚——插件注册的所有监听器、工具、定时器都会自动清理，不留垃圾。

对开发者来说，这意味着：**你可以把 dsh 当乐高积木，按自己的需求拼出一个专属的 Agent 运行时。**

---

## 🔍 核心理念二：每次运行都可追溯

第二个设计理念叫 **Every Run is Traceable（每次运行都可追溯）**。

dsh 会把模型"看到的一切"写进一条**只增不改（append-only）的会话日志**：

- 系统提示词
- 模型的推理过程
- 每一次工具调用和返回结果
- 子智能体的调度
- 每一次上下文注入

在 Web UI 的 **Trajectory（轨迹）视图**里，你可以按来源逐条检查这些记录。而恢复会话、分叉会话、搜索、回放，全部基于同一条事件流。

这点对两类人特别有价值：

- **调试 Agent 的开发者**：再也不用猜"模型到底看到了什么"，日志里全有
- **做 Agent 研究的人**：完整的轨迹数据就是现成的研究素材

架构文档里还有一条很硬核的运行时不变式：**"Model-visible means logged"——任何能到达模型请求的内容，必须可以从日志中重建出来。** 这种把可追溯性写成代码约束的做法，在同类产品里相当少见。

---

## 🎛️ 四种运行模式

dsh 开箱提供了四种模式，覆盖从日常开发到模型评测的不同场景：

| 模式 | 定位 |
|---|---|
| **Standard** | 完整编码智能体：文件编辑、Shell、文件/网络搜索、技能、规划、目标、子智能体、工作流 |
| **Code** | Standard 的全部能力，但工具通过 SDK 暴露，模型用一段 TypeScript 程序一次性编排多轮工具调用 |
| **Minimal** | 只保留持久化 bash + 一个文件编辑器，用来在最小环境里评测模型真实水平 |
| **Creator** | 用来"造 Agent"的模式：可以检查当前运行时、在内存里试验插件、组合出新的自定义模式 |

其中 **Code 模式**值得一说：它让模型把多步操作写成一个 TypeScript 程序来执行，减少来回的工具调用轮次——这也是当下 Harness 设计的一个前沿趋势。

而 **Creator 模式**则有点"自举"的味道：Agent 可以观察和改造自己身处的运行时。

另外，除了 Web UI，dsh 还提供**无头（headless）模式**——一行命令跑一次性任务：

```sh
dsh --profile headless "summarize this workspace"
```

以及 **ACP 自动化服务器**（JSON-RPC over stdio），方便接入编辑器和其他自动化工具。

---

## ⚡ 5 分钟上手

前置条件只有一个：**安装 Node.js**（22.19+ 或 24+）。

**第一步：启动 Web UI**

```sh
npx @deepseek-ai/dsh web
```

浏览器打开 `http://127.0.0.1:3080`。

**第二步：配置模型**

进入 Settings → Models，填入 DeepSeek API Key 保存即可，无需重启。也支持其他提供商和任意 OpenAI 兼容端点——**它并不锁死 DeepSeek 自家模型**。

**第三步：选择工作目录，开聊**

点 Choose workspace 选中你的项目目录，然后就可以直接下任务了，比如：

> Summarize this repository and identify its main packages.

Agent 可以读写工作区文件、执行命令、委派子任务、维护计划；涉及敏感操作时，会按权限策略先向你申请批准。

想从源码跑也很简单：

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

---

## 🧩 写个插件有多简单

dsh 里，一个插件就是一个导出 `apply` 函数的 TypeScript 模块。比如给 Agent 加一个 `greet` 工具：

```ts
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'greet-tool'
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'greet',
    description: 'Greet someone by name.',
    parameters: {
      name: { type: 'string', required: true, description: 'The name to greet' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      return `Hello, ${args.name}!`
    },
  }))
}
```

然后在配置文件里把这个文件挂载进去，重启 Web UI，对 Agent 说"用 greet 工具向 Ada 问好"，工具就被调用了。

几个对开发者很友好的细节：

- `inject = ['tools']` 声明依赖，框架会**等工具注册表就绪后再加载插件**，不用手动管理启动顺序
- 通过 `ctx` 注册的一切（监听器、工具、定时器）在插件卸载时**自动清理**
- 官方文档提供了从零开始的插件教程和 Cookbook

官方还开放了社区插件生态：给自己的插件仓库打上 `dsh-plugin` 话题标签就能被发现。

---

## 🗣️ 社区怎么看

Hacker News 上的讨论相当热闹，挑几个有意思的观点：

**"为什么这些 Agent Harness 都用 Node.js 写？"** 高赞回答：天生异步、到处能跑、解释型语言迭代快、npm 分发方便，而且 LLM 写 TypeScript 特别溜。也有人一针见血：Claude Code 火了之后，大家都在抄 Anthropic 的作业。

**"时空可组合性？听着像词语沙拉。"** 确实，论文名字劝退了不少人。但读过的开发者总结得很实在：Cordis 给插件系统加上了**热重载和动态启用/销毁**能力，并且一路扩展到了 UI 组件层面。

**"所以它的大创意就是个析构函数？"** 这是评论区最毒舌的一条。不过立刻有人反驳：插件卸载时所有副作用可预测地回滚，听起来平平无奇，但这是把"Agent 运行时能被安全地动态重组"变成了工程现实——这正是做自定义 Agent 平台的基础。

**被提到最多的亮点**是前面说的 Trajectory 视图："Everything the model sees is recorded"——模型看到的一切都被记录，这句话戳中了很多被 Agent 调试折磨过的开发者。

当然也有冷静的声音：项目仍处于**开发者预览（Developer Preview）**阶段，官方明确警告**未来会有破坏兼容性的变更**，现在上生产为时尚早。

---

## 🎓 对我们意味着什么

如果你正在学 AI Agent 开发，这个项目有三个值得关注的点：

**1. 这是官方出品的"教科书级"参考实现。** 模型厂商亲自写的 Harness，从会话日志、工具管线到子智能体调度，工程细节比大多数开源项目讲究得多。仓库里的架构文档 + Agent Notes 本身就是一套高质量学习资料。

**2. "一切皆插件"可能是下一代 Agent 框架的方向。** 当前主流的 Harness 大多是单体架构，改功能要动源码。dsh 展示了另一条路：能力全部服务化、配置化、可组合。这个设计思路值得提前理解。

**3. Harness 正在成为新的竞争维度。** 模型能力趋同之后，"谁家的 Harness 更好用"会直接影响开发者的选择。DeepSeek 开源这一手，既是技术输出，也是生态卡位。

> 💡 学习建议：先跑通 Web UI 感受一下，再读官方的 Architecture 文档理解插件树和事件系统，最后照着教程写一个自己的工具插件。这三步走完，你对"Agent Harness 到底是什么"会有脱胎换骨的理解。

---

## 📌 一句话总结

**DeepSeek Harness = 模型厂商亲自下场、把 Agent 运行时拆成乐高积木的开源尝试。** 它未必会取代你手里的 Claude Code 或 Codex，但它给出的两个答案——"一切皆插件"的架构和"每次运行都可追溯"的工程纪律——值得每个做 Agent 的人认真研究。

项目还在快速迭代，现在关注正是时候。

---

## 🔗 相关链接

- GitHub 仓库：https://github.com/deepseek-ai/deepseek-harness
- 官方网站：https://deepseek.com/harness
- 开发者文档：https://deepseek-harness.github.io/deepseek-harness/
- Cordis 论文：https://github.com/cordiverse/paper
- 社区插件合集：GitHub 搜索 `dsh-plugin` 话题

---

*如果这篇文章对你有帮助，欢迎**点赞、在看、转发**三连支持 🙌 关注我们，第一时间解读 AI 开发领域的重要开源动态。*
