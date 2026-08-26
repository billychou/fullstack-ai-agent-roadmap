---
title: Ralph Loop：一切皆循环
date: 2026-08-26
tags:
  - AI
  - Agent
  - 学习笔记
  - 译文摘录
status: done
source: https://ghuntley.com/loop/
---

# Ralph Loop：一切皆循环 —— Geoffrey Huntley 论演化式软件

> 原文：[everything is a ralph loop](https://ghuntley.com/loop/)（Geoffrey Huntley · 2026-01-17）
> 作者核心观点：软件开发方式正在发生根本性转变——从"搭积木"到"编程循环"。与 [[Agent工程师12步路线图]] 中 Loops 支柱、[[deepseek-harness学习指南]] 的 "Agent = Model + Harness" 思想一脉相承。

## 核心论点：从 Jenga 积木到 Loop 循环

作者反思自己三年前后构建软件的方式差异——不是指"用 AI 加速"，而是**方法论层面的根本改变**。传统软件实践是垂直地一块砖一块砖地搭（他比作 Jenga 叠叠乐），而他现在把一切（everything）都当作一个循环（loop）来处理。

ralph 不只是正向模式（自主构建）或反向模式（clean room 逆向重写），更是一种**心态**：这些计算机（LLM）确实是可以被编程的。工程师的角色没有消失，只是从"砌砖"变成了"编程循环"——自动化自己的工作职能。

> Software is now clay on the pottery wheel and if something isn't right then i just throw it back on the wheel to address items that need resolving.

软件变成了陶轮上的黏土：哪里不对，就放回轮上重新修整。

## Ralph 的形态：单体，而非多智能体

引用原 ralph 文章的观点，反对当下流行的 multi-agent / agent-to-agent 通信：

> Consider microservices and all the complexities that come with them. Now, consider what microservices would look like if the microservices (agents) themselves are non-deterministic—a red hot mess.

微服务已经够复杂了；如果每个微服务（agent）本身还是**非确定性**的，那就是一场灾难。与微服务相对的是单体应用——Ralph 是 monolithic 的：**单仓库、单进程、每循环执行一个任务**，垂直扩展。

Ralph 本质是一种编排（orchestrator）模式：准备好支撑性的规格说明（specs），给定一个目标，然后循环执行目标。

## Watch the loop：成长来自观察失败域

作者强调必须**盯着循环看**——个人成长和学习正来自这里。每当看到一个失败域（failure domain），就戴上工程师帽子把它彻底解决，让它永不复发。

实操上，"ralphing" 不一定是全自动：通过手动 prompt 逐步推进、或在每步之间暂停按 CTRL+C 再继续，都算 ralph——因为 ralph 的本质是**通过上下文工程（context engineering）榨取底层模型的最大能力**，而这个模式是通用的（GENERIC），适用于所有任务。

这与 [[Agent工程师12步路线图]] 的关键结论一致：Loops 不是独立技能，Context 工程是让循环收敛的前提。

## The Weaving Loom：通往 Level 9 演化式软件

作者公开了 [The Weaving Loom](https://github.com/ghuntley/loom)（并幽默注明：如果你不叫 Geoffrey Huntley 就别用）。这是他构思三年的基础设施——**演化式软件（evolutionary software）**。

参考系是 Steve Yegge 的 [Gas Town](https://steve-yegge.medium.com/welcome-to-gas-town-4f25ee16dd04)（转盘旋转与编排，level 8）；loom 的目标是 **level 9：自主循环演化产品并自动优化收入**——即"软件工厂"（software factory）。

## 对软件工程师的警告

作者的暴论：**software development is dead**——软件开发成本已低于快餐店汉堡工的时薪，且可以在人 AFK 时自主完成。

他担忧两类人：彻底拒绝 AI 的工程师，以及只把 Claude Code / Cursor 当加速器、仍在"搭乐高积木"的工程师。他表示现在招聘时会直接要求候选人具备这些基础能力并能展示构建成果。

但另一方面，世界仍然**极度需要**理解 "LLM 是一种新型可编程计算机" 的软件工程师。他的建议：**自己动手构建一个 coding agent**——不过 300 行代码：一个跑在循环里的 LLM token 流，不断往循环里投 token，就有了 agent。配套免费 workshop：[how to build a coding agent](https://ghuntley.com/agent/)。

## 见证时刻：演化式软件的首次自动愈合

文末作者演示了把 loom 放在 "the mother of all ralph loops" 下自动执行系统验证：不再需要数天的规划、讨论和数周的验证，而是给这台新计算机编程，AFK 完成（作者原话：边打碟边等，这样就不用雇人了）。

推文中记录了一次可能是**首次演化式软件自动愈合（auto-heal）**：系统在 ralph 循环测试中发现某功能的问题 → 研究代码库 → 修复 → 自动部署 → 验证通过。发现的问题再通过正向 ralph 循环修复。

结尾留给读者的问题：

> What if the models don't stop getting good? How well will you fare if you are still building jenga stacks...

如果模型持续变强、永不停歇，还在堆 Jenga 积木的人将如何竞争？

## 个人注记

- "单体 Agent + 单任务循环" 与 DSH（[[deepseek-harness学习指南]]）的 ReactLoopAgent、以及 [[Agent工程师12步路线图]] 中"Loops 是七支柱之一"的观点互为印证：2026 年 Agent 社区的共识正在收敛到 **Loop + Context Engineering + Evals**，而非多智能体拓扑。
- 与 [[AI感悟]] 中"人才密度/能动性"话题相关：作者把"会编程循环"作为招聘硬门槛，是这个判断的激进版本。
- 落到自身实践：[[软件工程AI学习规划]] 的 Agent 工作流阶段应补一块——亲手写一个 300 行的 coding agent loop，比用任何现成工具都更能建立对"LLM 是可编程计算机"的直觉。
