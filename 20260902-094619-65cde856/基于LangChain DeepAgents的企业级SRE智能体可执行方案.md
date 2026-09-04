# 基于LangChain DeepAgents的企业级SRE智能体可执行方案

**参考业界最佳实践的可执行实施方案**

**报告日期：2026年9月2日**

## 摘要

本方案以 LangChain DeepAgents 为底座，设计了一套可落地的企业级 SRE 智能体实施方案。DeepAgents 是基于 LangGraph 的开源智能体框架，其执行环境、上下文管理、任务委派与人机干预四大能力支柱，与 SRE 的分工调查、证据归档、变更管控、知识加载四类诉求高度匹配。方案采用"协调者—领域专家子代理"分层架构，通过 MCP 协议接入 Prometheus、Kubernetes 等工具链，以 Agent Skills 标准沉淀 runbook 知识，形成从告警触发到知识回写的六环节闭环。安全层面，以声明式权限规则、中断审批、动态凭证注入与全量审计构成六层护栏体系，高危操作强制人工确认。生产运行时采用 PostgreSQL 持久化线程状态与长期记忆，以子代理流投影实现排查过程实时可观测。质量保障借鉴业界"瑞士奶酪"四层验证（本地测试、黄金标准回归、影子代理、LLM 裁判），并以 RCA 准确率、缓解计划安全性等指标构建评估闭环。实施遵循"只读调查—建议生成—受控自动化"三阶段信任递进路径，最终目标是将故障调查阶段压缩至分钟级，让值班工程师醒来即见根因结论。

## 1. 背景、目标与成功标准

### 1.1 为什么企业 SRE 需要智能体化自动化

随着现代应用演变为由无服务器函数、微服务与事件驱动架构构成的复杂生态系统，故障响应难度持续上升。DevOps 与 SRE 团队需要在多个可观测性工具之间人工关联数据，耗费数小时排查问题，并与 SLA 截止时间赛跑；这种被动救火模式消耗团队生产力，也拖累服务可靠性[亚马逊](https://aws.amazon.com/blogs/devops/building-an-end-to-end-agentic-sre-using-aws-devops-agent/)。行业研究显示，分布式系统中调查阶段占据事件处理总时间的60%-80%，自动化收益最高的切入点正是压缩这一阶段[sherlocks.ai](https://www.sherlocks.ai/how-to/reduce-mttr-in-2026-from-alert-to-root-cause-in-minutes)。

引入 AI SRE 智能体的目标，不是替代值班工程师，而是把人的介入起点从"告警发生"后移到"根因已定位"。AWS 基于 DevOps Agent 发布的参考实现体现了这一理念：智能体完成自动调查后，将调查结果与建议推送至 Slack，让值班工程师"醒来时看到的是根因结论，而不是活跃故障"[亚马逊](https://aws.amazon.com/blogs/devops/building-an-end-to-end-agentic-sre-using-aws-devops-agent/)。行业厂商也给出了量化预期，例如 Resolve AI 在其产品文档中宣称 AI SRE 可将 MTTR 降低80%，该数字属于厂商口径，企业落地时应以自身环境的基线数据校准。

因此，本方案将智能体化自动化定位为企业 SRE 能力升级的核心路径：用成熟的智能体框架承载调查与推理，用标准化协议连接可观测性工具链，用严格的护栏约束执行边界，最终形成一套可靠、可审计、可持续演进的智能运维体系。业界对这套体系的要素已有共识性总结，即安全性、遥测数据整合、变更上下文关联三项[komodor.com](https://komodor.com/blog/building-trust-in-the-machine-a-guide-to-architecting-agentic-ai-for-sre/)。

### 1.2 方案定位与成功标准

本方案的总体定位是：调查先行、建议为主、高危操作强制人审。这一定位源于业界对 LLM 风险的判断——缺少护栏的智能体可能自信地给出加剧故障的操作建议，因此自主 SRE 的第一条规则是"不造成伤害"，敏感操作必须经过充分验证与人机协同确认[komodor.com](https://komodor.com/blog/building-trust-in-the-machine-a-guide-to-architecting-agentic-ai-for-sre/)。据此，本方案中智能体的默认行动边界止步于调查与建议生成，所有写操作均纳入审批流程。

基于该定位，成功标准拆解为三个可度量维度：

**表1：方案目标与成功标准**

| 维度   | 现状痛点                                                                                                                           | 目标状态                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| MTTR | 调查阶段占事件处理时间的60%-80%[sherlocks.ai](https://www.sherlocks.ai/how-to/reduce-mttr-in-2026-from-alert-to-root-cause-in-minutes)     | 自动调查将该阶段压缩至分钟级[sherlocks.ai](https://www.sherlocks.ai/how-to/reduce-mttr-in-2026-from-alert-to-root-cause-in-minutes)   |
| 告警响应 | 工程师跨工具人工关联数据，与 SLA 截止时间赛跑[亚马逊](https://aws.amazon.com/blogs/devops/building-an-end-to-end-agentic-sre-using-aws-devops-agent/) | 智能体自动完成多源关联并推送根因结论[亚马逊](https://aws.amazon.com/blogs/devops/building-an-end-to-end-agentic-sre-using-aws-devops-agent/) |
| 知识沉淀 | 故障处理经验依赖个体传递                                                                                                                   | 处理过程沉淀为结构化 Agent Skills 按需加载[agentskills.io](https://agentskills.io/specification)                                      |

表中三项目标状态分别对应第 8 章分阶段实施路线图的三个阶段，每一阶段的晋级都以该阶段准入标准为依据，避免能力扩张快于信任建立。

## 2. 技术选型：LangChain DeepAgents 能力映射

### 2.1 DeepAgents 核心能力概览

Deep Agents 是构建于 LangGraph 之上的开源智能体框架（官方称为 agent harness），面向生产级智能体部署设计，官方建议配套 LangSmith 完成追踪、评估与监控[langchain.com](https://docs.langchain.com/oss/python/deepagents/overview)。它的产品形态是开箱即用、观点明确的智能体，同时每一个组件都可以扩展、覆写或替换，企业可以按自身需求逐步改造[亚马逊](https://aws.amazon.com/blogs/devops/building-an-end-to-end-agentic-sre-using-aws-devops-agent/)。

Deep Agents 的能力体系由四大支柱构成，这一划分同时体现在官方文档与社区对其架构的解析中[langchain.com](https://docs.langchain.com/oss/python/deepagents/overview)：

**表2：DeepAgents 四大能力支柱与内置组件**

| 能力支柱 | 内置组件 |
|----------|----------|
| 执行环境 | 工具调用、虚拟文件系统（支持读写、执行、权限控制）、可选沙箱、REPL 解释器[langchain.com](https://docs.langchain.com/oss/python/deepagents/overview) |
| 上下文管理 | 技能、记忆、摘要、人机协同中断的中间件栈[langchain.com](https://docs.langchain.com/oss/python/deepagents/overview) |
| 任务委派 | 子代理编排（隔离上下文、并行任务）、可选任务规划[langchain.com](https://docs.langchain.com/oss/python/deepagents/overview) |
| 人机干预 | 审批与中断机制[langchain.com](https://docs.langchain.com/oss/python/deepagents/overview) |

在模型接入上，框架通过 init_chat_model 统一接入 OpenAI、Anthropic、Azure OpenAI、Google Gemini、AWS Bedrock、HuggingFace 六类模型服务，企业可按数据合规要求自由切换模型。由于构建于 LangGraph 运行时之上，Deep Agents 天然具备生产环境所需的长任务执行与状态持久化基础[langchain.com](https://docs.langchain.com/oss/python/deepagents/overview)。

### 2.2 DeepAgents 能力与 SRE 场景的映射

将四大能力支柱与 SRE 的核心工作逐项对照，可以看到框架内置能力与跨域调查、证据归档、变更管控、知识加载四类需求近乎一一对应，选型匹配度高：

**表3：SRE 场景诉求与 DeepAgents 能力映射**

| SRE 场景诉求 | 对应 DeepAgents 能力 | 说明 |
|--------------|----------------------|------|
| 跨域分工调查（指标、日志、集群、代码） | 子代理编排 | 专家子代理在隔离上下文中运行，支持并行任务[langchain.com](https://docs.langchain.com/oss/python/deepagents/overview) |
| 调查证据归档与报告生成 | 虚拟文件系统 | 支持读写、执行、权限控制[langchain.com](https://docs.langchain.com/oss/python/deepagents/overview) |
| 高危变更管控 | 中断审批 | 敏感工具调用可通过 interrupt_on 中断，交由人工审批[langchain.com](https://docs.langchain.com/oss/python/deepagents/human-in-the-loop) |
| Runbook 按需加载 | 技能中间件 | 技能能力内置于中间件栈[langchain.com](https://docs.langchain.com/oss/python/deepagents/overview) |
| 细粒度文件访问控制 | FilesystemPermission | 基于路径的读、写、中断权限规则[langchain.com](https://docs.langchain.com/oss/python/deepagents/permissions) |
| 全链路追踪与评估 | LangSmith 生态 | 配套追踪、评估、监控，面向生产部署[langchain.com](https://docs.langchain.com/oss/python/deepagents/overview) |

这一映射关系直接决定了第 3 章的架构设计：子代理编排承载"协调者—领域专家"调查体系，虚拟文件系统承载调查工作区，中断审批与权限规则共同构成护栏体系，技能承载 runbook 知识。框架同时预留了扩展空间——当某个内置组件无法满足需求时，可以单独替换或覆写该组件，而不必推翻整体设计[亚马逊](https://aws.amazon.com/blogs/devops/building-an-end-to-end-agentic-sre-using-aws-devops-agent/)。

## 3. 总体架构设计

### 3.1 Orchestrator-SME 分层智能体架构

本方案采用"协调者（Orchestrator）—领域专家子代理（SME）"分层架构。设计依据有两点：能力层面，Deep Agents 的子代理编排支持隔离上下文与并行任务，天然适配多领域并行调查[langchain.com](https://docs.langchain.com/oss/python/deepagents/overview)；质量层面，业界实践表明，把调查任务切分给多个专职智能体、每个智能体只处理本领域数据，能显著降低单个智能体面对的噪声，进而降低幻觉概率[komodor.com](https://komodor.com/blog/building-trust-in-the-machine-a-guide-to-architecting-agentic-ai-for-sre/)。

各角色职责划分如下：

**协调者（Orchestrator）**：基于 create_deep_agent 构建的主智能体，负责理解告警或用户提问的上下文，将调查任务拆解并委派给对应的专家子代理，最终综合各方证据形成根因结论。协调者自身不直接执行领域查询，避免海量原始遥测数据污染其上下文窗口。

**观测专家子代理**：接入 Prometheus MCP Server，负责指标查询、异常检测与趋势分析[GitHub](https://github.com/pab1it0/prometheus-mcp-server)。

**基础设施专家子代理**：接入 Kubernetes MCP Server，负责检查集群状态、Pod 事件与资源配置[GitHub](https://github.com/flux159/mcp-server-kubernetes)。

**日志专家子代理**：接入企业日志平台，负责日志聚类与异常模式提取。这一环节业界普遍采用"传统 ML 降噪 + LLM 推理"的混合智能模式：先用传统算法对原始日志聚类去噪、提取错误模式，再由 LLM 对精简后的模式进行推理，避免上下文饱和引发幻觉[komodor.com](https://komodor.com/blog/building-trust-in-the-machine-a-guide-to-architecting-agentic-ai-for-sre/)。

**代码关联专家子代理**：接入代码仓库与部署系统，关联近期部署记录与代码差异。Azure SRE Agent 的实践验证了这一环节的价值：智能体关联代码仓库后，可在 RCA 报告中精确定位代码差异，并自动在 GitHub 或 Azure DevOps 创建开发者工作项，把事件与提交记录、拉取请求、部署历史关联起来，加速修复闭环[微软](https://learn.microsoft.com/en-us/azure/sre-agent/overview)。

每个专家子代理的权限可独立配置：子代理默认继承父代理的权限规则，需要差异化控制时，可在其配置中单独设置 permissions 字段，整体替换父代理规则，实现角色间的最小权限隔离。

### 3.2 端到端事件处理闭环流程

完整的事件处理流程形成六个环节的闭环，每个环节的输入、输出与承接组件明确定义：

**环节一，告警触发**：Webhook 接收来自 Prometheus Alertmanager 或事件管理平台的事件，创建调查线程。AWS 参考实现通过 Webhook 接收告警，再经 MCP 集成多源数据，该模式已在包含 CloudWatch、Splunk、GitHub 的生产环境中得到验证[亚马逊](https://aws.amazon.com/blogs/devops/building-an-end-to-end-agentic-sre-using-aws-devops-agent/)。

**环节二，调查取证**：协调者拆解任务，委派观测、日志、基础设施、代码关联四类专家子代理并行调查；各子代理的调查过程由预先配置的 runbook 与技能引导。AWS 实践表明，以 runbook 与技能贯穿调查全程，可以让智能体行为始终与既定 SRE 规程保持一致[亚马逊](https://aws.amazon.com/blogs/devops/building-an-end-to-end-agentic-sre-using-aws-devops-agent/)。

**环节三，根因分析**：协调者汇总各子代理证据，交叉验证后生成带证据链的 RCA 报告，写入虚拟文件系统的调查工作区存档。

**环节四，缓解计划生成**：基于根因结论，输出符合 Pydantic Schema 的结构化缓解计划，包含准备、验证、应用、回滚四个阶段，确保下游工单与自动化系统可直接解析[OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs)。

**环节五，审批执行**：缓解计划推送值班工程师审批，批准后执行变更；审批与执行通过 LangGraph 的中断机制挂起与恢复[langchain.com](https://docs.langchain.com/oss/python/deepagents/human-in-the-loop)。

**环节六，效果验证与知识沉淀**：执行完成后，智能体持续观测指标恢复情况，把处理过程回写事件时间线，并将可复用的处理经验沉淀为结构化 Agent Skills[agentskills.io](https://agentskills.io/specification)。

闭环的价值，最终体现在值班工程师的体验变化上：从被活跃故障叫醒，转变为醒来即看到已定位的根因与可执行的建议[亚马逊](https://aws.amazon.com/blogs/devops/building-an-end-to-end-agentic-sre-using-aws-devops-agent/)。

## 4. 工具链与运维知识接入

### 4.1 MCP 标准化工具接入

本方案通过 Model Context Protocol（MCP）统一接入观测与控制工具。选择 MCP 的理由是标准化：工具能力以标准接口描述与调用，后续新增数据源只需增加 MCP Server 配置，不必修改智能体代码。LangChain 生态的 langchain-mcp-adapters 提供 MultiServerMCPClient，可把 MCP 工具转换为 LangChain 工具，直接注入智能体[GitHub](https://github.com/langchain-ai/langchain-mcp-adapters)；它支持 stdio 与 http 两种传输方式连接多个服务器，并可通过 tool_interceptors 实现运行时上下文注入（如用户身份、API 凭证）[langchain.com](https://docs.langchain.com/oss/python/langchain/mcp)。

**表4：本方案接入的 MCP 工具清单**

| 接入对象 | 在本方案中的定位 |
|----------|------------------|
| prometheus-mcp-server | 核心观测接口，供智能体查询与分析 Prometheus 指标[GitHub](https://github.com/pab1it0/prometheus-mcp-server) |
| mcp-server-kubernetes | 核心控制接口，供智能体与 Kubernetes 集群安全交互[GitHub](https://github.com/flux159/mcp-server-kubernetes) |

智能体初始化与 MCP 连接的参考代码如下：

```python
import asyncio
from langchain_mcp_adapters.client import MultiServerMCPClient
from deepagents import create_deep_agent

async def initialize_sre_agent():
    client = MultiServerMCPClient({
        "prometheus": {
            "transport": "http",
            "url": "http://prometheus-mcp-server:8000/mcp",
            "headers": {"Authorization": "Bearer YOUR_PROM_TOKEN"}
        },
        "kubernetes": {
            "transport": "stdio",
            "command": "mcp-server-kubernetes",
            "args": ["--context", "prod-cluster"]
        }
    })
    tools = await client.get_tools()
    agent = create_deep_agent(
        model="anthropic:claude-sonnet-4-6",
        tools=tools,
        system_prompt="You are an expert SRE. Follow the runbooks in your skills."
    )
    return agent
```

工程上有两点注意事项：第一，示例中的凭证不应硬编码，生产环境应改用 tool_interceptors 从密钥管理系统动态注入[langchain.com](https://docs.langchain.com/oss/python/langchain/mcp)；第二，生产集群使用的 Kubernetes MCP Server 应限定只读 kubectl 上下文，写操作单独暴露给受控服务账号，并与中断审批联动[GitHub](https://github.com/flux159/mcp-server-kubernetes)。

### 4.2 结构化运维知识（Agent Skills）

Runbook 与应急预案是 SRE 团队的核心知识资产。本方案按 Agent Skills 开放标准将其封装为按需加载的技能。该标准要求每个技能是一个至少包含 SKILL.md 的目录；SKILL.md 必须包含 YAML frontmatter 与 Markdown 正文；name 字段最长64字符，仅允许小写字母、数字与连字符；description 字段最长1024字符，需同时说明技能做什么、何时使用；可选字段包括 license、compatibility、metadata、allowed-tools 四项；目录内可附带 scripts、references、assets 资源子目录，支持渐进式披露[agentskills.io](https://agentskills.io/specification)。

description 字段的设计决定技能能否被正确加载，应包含具体的告警关键词，让智能体在对应故障出现时准确命中。以常见的 CrashLoopBackOff 故障为例，技能按如下结构组织：

```text
skills/
└── k8s-pod-crashloop/
    ├── SKILL.md
    └── references/
        └── debug_commands.md
```

```markdown
---
name: k8s-pod-crashloop
description: Troubleshoot Kubernetes pods stuck in CrashLoopBackOff. Use when alerts mention pod restarts or OOMKilled events.
compatibility: Requires kubectl access and cluster read permissions.
---

**CrashLoopBackOff 排查指南**

## 步骤 1：确认 Pod 状态
使用 kubectl get pods -n <namespace> 检查状态。

## 步骤 2：检查日志
运行 kubectl logs <pod-name> --previous 查看崩溃前的最后输出。

## 步骤 3：资源分析
如果日志显示 OOMKilled，请检查 kubectl describe pod 中的 Limits/Requests 设置。

## 常见解决方案
- 内存不足：建议增加 Limit 或优化应用内存占用。
- 配置错误：检查 ConfigMap 或 Secret 挂载是否正确。
- 启动探针失败：验证 Liveness Probe 的路径和端口。

参考 references/debug_commands.md 获取更多高级诊断命令。
```

这种结构化方式对企业有两方面价值：其一，技能按需加载，只在对应故障调查时进入上下文，避免整套 runbook 库常驻造成上下文污染；其二，每次故障的处理经验经评审后可沉淀为新技能，形成知识积累的正循环。业界参考实现也配套设计了知识捕获流程，由 SRE 在调查过程中提供上下文指导，确保经验持续回流知识库。

## 5. 安全护栏与人机协同

### 5.1 权限控制与最小权限原则

企业级应用的首要原则是"不造成伤害"。DeepAgents 提供了声明式的文件系统权限系统，可以按路径实施三类控制：allow（允许）、deny（拒绝）、interrupt（中断）。权限规则通过 FilesystemPermission 传入 create_deep_agent，按声明顺序匹配，首条命中的规则生效；没有任何规则匹配时，默认放行，因此企业必须显式配置兜底拒绝规则[langchain.com](https://docs.langchain.com/oss/python/deepagents/permissions)。

三类模式的分工是：allow 用于开放工作区读写，deny 用于封锁敏感文件，interrupt（需要 deepagents 0.6.8 及以上版本）用于在写操作命中规则时暂停执行、发起人工审批，审批人可批准、编辑或拒绝该次调用，处理流程与工具调用中断一致[langchain.com](https://docs.langchain.com/oss/python/deepagents/permissions)。目录删除采取整体一致策略：删除操作会检查目标路径及其全部后代路径的写权限，任何一个被拒绝则整体拒绝，不会部分执行；普通文件删除则按精确匹配走首条命中规则[langchain.com](https://docs.langchain.com/oss/python/deepagents/permissions)。

本方案的权限配置示例如下：

```python
from deepagents import create_deep_agent
from deepagents.middleware.permissions import FilesystemPermission

permissions = [
    FilesystemPermission(
        operations=["read", "write"],
        paths=["/workspace/incidents/**"],
        mode="allow"
    ),
    FilesystemPermission(
        operations=["read", "write"],
        paths=["/etc/secrets/**", ".env"],
        mode="deny"
    ),
    FilesystemPermission(
        operations=["write", "delete"],
        paths=["/workspace/**"],
        mode="interrupt"
    )
]

agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-6",
    permissions=permissions,
    interrupt_on={"execute": True}
)
```

配置要点有四点。第一，规则顺序即匹配优先级，更具体的规则必须写在更宽泛的规则之前，本方案中针对敏感路径的 deny 规则写在工作区 interrupt 规则之前，确保敏感路径永远命中拒绝[langchain.com](https://docs.langchain.com/oss/python/deepagents/permissions)。第二，子代理默认继承父代理权限，观测、日志、基础设施、代码关联四类专家如需差异化控制，在其子代理配置中单独设置 permissions 字段整体替换[langchain.com](https://docs.langchain.com/oss/python/deepagents/permissions)。第三，权限仅覆盖内置文件系统工具（ls、read_file、glob、grep、write_file、edit_file、delete），自定义工具与访问文件系统的 MCP 工具不在覆盖范围内，沙箱后端也不受路径权限约束，这些路径需要在工具层另行约束[langchain.com](https://docs.langchain.com/oss/python/deepagents/permissions)。第四，官方文档提示，智能体可能读取到任何可访问的文件（包括 API 密钥、凭据、.env 文件、SSH 密钥），必须把敏感文件彻底排除在智能体可读范围之外[langchain.com](https://docs.langchain.com/langsmith/evaluation-concepts)。

### 5.2 人工审批与多层护栏体系

在生产环境中，智能体不能自主执行变更。当智能体尝试调用 kubectl apply 或修改 Terraform 文件时，流程通过 LangGraph 的 interrupt 机制自动挂起；值班工程师在 Slack 或 Dashboard 收到审批请求，可查看智能体生成的影响面分析报告；工程师批准后，智能体恢复执行并监控变更效果[langchain.com](https://docs.langchain.com/oss/python/deepagents/human-in-the-loop)。Deep Agents 对审批场景提供了内建支持：可通过 interrupt_on 配置需要审批的工具[langchain.com](https://docs.langchain.com/oss/python/deepagents/human-in-the-loop)，配合 FilesystemPermission 的 interrupt 模式，使文件系统写操作同样进入审批通道[langchain.com](https://docs.langchain.com/oss/python/deepagents/permissions)。

中断审批只是护栏体系的一层。业界通行的框架把护栏分为多个层次协同生效，业界实践还提示了一个工程权衡：串行护栏强制会为每次智能体动作增加 300–800 毫秒延迟，护栏链设计需要在安全性与时延之间取得平衡。本方案的护栏分层设计如下：

**表5：护栏体系分层设计**

| 层级 | 机制 | 防护目标 |
|------|------|----------|
| 输入层 | 提示词约束与技能引导 | 限定任务范围，禁止执行清单外动作[OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs) |
| 工具层 | 工具白名单与只读上下文 | 写类工具默认不暴露给智能体[langchain.com](https://docs.langchain.com/oss/python/deepagents/human-in-the-loop) |
| 权限层 | FilesystemPermission 路径规则 | 封锁敏感文件，开放最小工作区[langchain.com](https://docs.langchain.com/oss/python/deepagents/permissions) |
| 审批层 | interrupt 中断 + 人工审批 | 高危操作强制人工确认[langchain.com](https://docs.langchain.com/oss/python/deepagents/human-in-the-loop) |
| 凭证层 | tool_interceptors 动态注入 | 凭证明文不落盘、不进入上下文[langchain.com](https://docs.langchain.com/oss/python/langchain/mcp) |
| 审计层 | 全量工具调用日志 | 事后追溯与合规审查[langchain.com](https://docs.langchain.com/oss/python/langchain/mcp) |

凭证层的参考实现如下，凭证从密钥管理系统动态获取，同时记录审计日志：

```python
import logging
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.interceptors import MCPToolCallRequest

logger = logging.getLogger("sre_audit")

async def vault_auth_interceptor(request: MCPToolCallRequest, handler):
    if request.name in ["kubectl_exec", "k8s_patch_resource"]:
        token = await fetch_vault_token("kubernetes-prod")
        request = request.override(headers={"Authorization": f"Bearer {token}"})
    logger.info(f"Audit: User invoked tool '{request.name}' with args: {request.args}")
    return await handler(request)

client = MultiServerMCPClient(
    {"k8s": {"transport": "http", "url": "..."}},
    tool_interceptors=[vault_auth_interceptor]
)
```

审计范围应覆盖智能体的推理步骤，而不仅是工具执行结果，以便在安全事件复盘时完整重建智能体的决策过程[langchain.com](https://docs.langchain.com/oss/python/langchain/mcp)。

## 6. 生产运行时配置

### 6.1 状态持久化与长期记忆

生产环境必须配置持久化后端，以支撑人机协同的中断恢复、进程重启后的任务续跑与故障容错。LangGraph 提供两套互补的持久化机制，职责边界清晰：

**表6：Checkpointer 与 Store 的职责对比**

| 维度 | Checkpointer | Store |
|------|--------------|-------|
| 持久化内容 | 图状态快照 | 应用自定义的键值数据 |
| 作用范围 | 单个线程 | 跨线程 |
| 记忆类型 | 短期、线程内记忆 | 长期、跨线程记忆 |
| 用途 | 会话连续性、人机协同、时间旅行、故障容错 | 用户偏好、事实、共享知识 |
| 访问方式 | 在图配置中传入 thread_id | 在节点或应用代码中读写条目 |

在 SRE 智能体中，Checkpointer 保存每次事件调查线程的中间状态（已收集的证据、子代理进度、待审批动作），Store 保存跨事件复用的长期记忆（故障模式知识、团队偏好、历史处理策略）。两者的生产初始化代码如下：

```python
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.store.postgres import PostgresStore

DB_URI = "postgresql://user:pass@localhost:5432/sre_db"

checkpointer = PostgresSaver.from_conn_string(DB_URI)  # 短期线程状态
checkpointer.setup()

store = PostgresStore.from_conn_string(DB_URI)  # 长期跨线程记忆
store.setup()

sre_agent = agent.compile(checkpointer=checkpointer, store=store)
```

初始化有四项官方注意事项。第一，首次使用必须调用 setup() 创建所需的表结构。第二，手动创建连接传入时，必须带 autocommit=True 与 row_factory=dict_row，否则建表可能不持久化、读取时会抛出 TypeError。第三，设置 LANGGRAPH_STRICT_MSGPACK=true 或显式传入 allowed_msgpack_modules，把检查点反序列化限制在已知安全类型内，防止数据库被入侵时触发代码执行。第四，thread_id 列有长度限制，取值必须控制在255字符以内，建议使用 UUID。开发阶段可用 SqliteSaver 降低依赖，内存版 MemorySaver 不跨进程持久化，不得用于生产。

### 6.2 流式监控与执行可观测性

SRE 故障排查是长链路过程，值班工程师需要实时看到调查进展，而不是等待最终报告。Deep Agents 在 LangGraph 流式能力之上，为子代理提供了专属的流投影：通过 stream.subagents 获取句柄，每个句柄对应一次委派的任务调用，句柄名称即子代理配置名，也就是协调者调用 task 工具时传入的 subagent_type。每个子代理流句柄可暴露 messages、tool_calls、values、subagents、output 五类投影，支持递归监听嵌套子代理；该投影是轻量级的——先发现子代理任务，只有访问某个句柄的具体投影时才打开对应的消息流与工具调用流。

两类流投影的定位需要区分：stream.subgraphs 展示的是图执行结构，面向调试；stream.subagents 展示的是产品级的任务委派视图，隐藏内部图节点，直接暴露子代理概念，面向用户界面。因此本方案的监控视图按以下方式组织：事件调查面板以 stream.subagents 遍历各专家子代理的启动与完成状态，值班工程师在面板上实时看到观测、日志、基础设施、代码关联四个调查线程的进展；需要深入查看某个子代理的工具调用细节时，再订阅该句柄的 tool_calls 投影。协调者与子代理的输出会交错产生，实时界面需用 asyncio.gather 并发消费，或借助 stream.interleave 合并流。

观测体系还须接入追踪平台。官方明确建议将 Deep Agents 与 LangSmith 配套使用，完成请求追踪、智能体行为调试与输出评估[langchain.com](https://docs.langchain.com/oss/python/deepagents/overview)。本方案要求所有事件调查线程在 LangSmith 中可回放：从告警触发、子代理委派、工具调用到审批记录全链路留痕，这既是排障手段，也是第 7 章评估体系的数据基础。

## 7. 质量保障与评估体系

### 7.1 瑞士奶酪分层验证

业界对 SRE 智能体质量建设的核心主张是：信任优先于功能广度——与其追求智能体能做多少事，不如先确保它做的事值得信任，质量标准的参照系是"一个资深 SRE 会怎么做"[komodor.com](https://komodor.com/blog/building-trust-in-the-machine-a-guide-to-architecting-agentic-ai-for-sre/)。据此，本方案在上线前建立四层验证体系，层层拦截幻觉与误判：

**第一层，本地开发测试**：使用生产环境脱敏数据进行高频迭代测试，在开发阶段尽早暴露工具调用错误与推理偏差[komodor.com](https://komodor.com/blog/building-trust-in-the-machine-a-guide-to-architecting-agentic-ai-for-sre/)。

**第二层，黄金标准回归**：维护一组已知故障场景（如 OOMKilled、ImagePullBackOff），每次更新提示词或工具后运行回归测试，确保既有能力不退化[komodor.com](https://komodor.com/blog/building-trust-in-the-machine-a-guide-to-architecting-agentic-ai-for-sre/)。场景数据集应随生产事件持续扩充，覆盖企业环境中最常出现的故障类型。

**第三层，影子代理**：在生产环境并行运行新旧版本智能体，对比两者的诊断结论，发现差异但不让实验版本接触生产系统[komodor.com](https://komodor.com/blog/building-trust-in-the-machine-a-guide-to-architecting-agentic-ai-for-sre/)。影子模式是灰度放量的前置关卡：新版本智能体必须在影子阶段与线上版本的结论一致性达标，才允许进入人工审批辅助阶段。

**第四层，LLM 裁判**：用高推理能力的独立模型对智能体输出打分。自然语言输出无法人工规模化评审，LLM 裁判承担逻辑严密性、证据充分性与安全性三维度的自动质检[komodor.com](https://komodor.com/blog/building-trust-in-the-machine-a-guide-to-architecting-agentic-ai-for-sre/)。

四层验证背后是业界对 LLM 风险的系统性认知：直接包装 LLM 处理运维数据会遭遇三类问题——取悦倾向导致幻觉（智能体自信地给出错误建议）、上下文窗口饱和（海量遥测数据涌入时即便 200k token 窗口也会失效）、垃圾进垃圾出（缺乏数据工程时噪声淹没信号）[komodor.com](https://komodor.com/blog/building-trust-in-the-machine-a-guide-to-architecting-agentic-ai-for-sre/)。四层验证与传统 ML 降噪的混合智能模式，正是针对这三类问题的对应解法。业界的底线表述是："宁可沉默，也不要给出错误答案"[komodor.com](https://komodor.com/blog/building-trust-in-the-machine-a-guide-to-architecting-agentic-ai-for-sre/)。

### 7.2 量化评估指标与持续优化

验证体系之外，还需要可量化的指标驱动持续优化。本方案以 LangSmith 的 Dataset 与自定义 Evaluator 构建评估闭环，评估数据集由历史真实事件构建：将既往事件的告警输入、标准根因、实际缓解步骤整理为数据条目，形成可重复回放的回归基准。

核心评估指标定义如下：

**表7：核心评估指标定义**

| 指标 | 定义 | 数据来源 |
|------|------|----------|
| RCA 准确率 | 预测根因与标准答案的语义一致性 | 历史事件重放[langchain.com](https://docs.langchain.com/langsmith/evaluation-concepts) |
| 缓解计划安全性 | 计划中是否含高危命令 | 规则扫描[langchain.com](https://docs.langchain.com/langsmith/evaluation-concepts) |
| MTTR | 从告警触发到根因定位的耗时 | 生产追踪[sherlocks.ai](https://www.sherlocks.ai/how-to/reduce-mttr-in-2026-from-alert-to-root-cause-in-minutes) |
| 告警噪声抑制率 | 智能聚合抑制的无效告警占比 | 告警平台对账[亚马逊](https://aws.amazon.com/blogs/devops/building-an-end-to-end-agentic-sre-using-aws-devops-agent/) |

RCA 准确率与安全性两项指标的自动评估器实现如下：

```python
from langsmith.evaluation import evaluate
from langsmith.schemas import Run, Example

def rca_accuracy_evaluator(run: Run, example: Example) -> dict:
    predicted_rca = run.outputs.get("root_cause_summary", "")
    actual_rca = example.outputs.get("ground_truth_rca", "")
    score = calculate_similarity(predicted_rca, actual_rca)
    return {"key": "rca_accuracy", "score": score}

def safety_score_evaluator(run: Run, example: Example) -> dict:
    plan = str(run.outputs.get("mitigation_plan", ""))
    is_safe = not any(cmd in plan for cmd in ["rm -rf /", "drop table"])
    return {"key": "safety_score", "score": 1 if is_safe else 0}

results = evaluate(
    lambda inputs: sre_agent.invoke(inputs),
    data="sre-incidents-dataset-v1",
    evaluators=[rca_accuracy_evaluator, safety_score_evaluator]
)
```

评估闭环的运转方式是：每次提示词、技能或工具链变更后运行离线回归，指标达标才允许进入影子阶段；生产运行数据通过 LangSmith 追踪持续回流，新事件沉淀为数据集条目，评估基准随环境演进而更新[langchain.com](https://docs.langchain.com/langsmith/evaluation-concepts)。阶段性效果目标对齐第 1 章的成功标准：调查阶段耗时向分钟级压缩[sherlocks.ai](https://www.sherlocks.ai/how-to/reduce-mttr-in-2026-from-alert-to-root-cause-in-minutes)，无效告警干扰显著下降，故障处理经验持续转化为结构化技能[agentskills.io](https://agentskills.io/specification)。

## 8. 实施路线图与关键风险

### 8.1 分阶段实施路线图

实施路径遵循"只读调查—建议生成—受控自动化"的信任递进逻辑，与业界"信任优先于功能广度"的主张一致：先建立信任，再扩大行动边界，每个阶段都有明确的晋级标准，不达标不进入下一阶段。

**表8：分阶段实施计划**

| 阶段 | 能力范围 | 交付物 | 晋级标准 |
|------|----------|--------|----------|
| 第一阶段：只读调查 | 告警接收、多源数据关联、自动调查 | 只读权限的协调者与四类专家子代理[langchain.com](https://docs.langchain.com/oss/python/deepagents/overview) | RCA 准确率与安全性在黄金标准集上达标[langchain.com](https://docs.langchain.com/langsmith/evaluation-concepts) |
| 第二阶段：建议生成 | RCA 报告、结构化缓解计划、审批通道 | Pydantic Schema 结构化输出[OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs)、interrupt 审批流[langchain.com](https://docs.langchain.com/oss/python/deepagents/human-in-the-loop) | 影子模式结论一致性达标[komodor.com](https://komodor.com/blog/building-trust-in-the-machine-a-guide-to-architecting-agentic-ai-for-sre/) |
| 第三阶段：受控自动化 | 批准后自动执行低风险缓解、效果验证、知识回写 | 全闭环流程、知识沉淀流水线[亚马逊](https://aws.amazon.com/blogs/devops/building-an-end-to-end-agentic-sre-using-aws-devops-agent/) | 生产 MTTR 与噪声指标达到成功标准[sherlocks.ai](https://www.sherlocks.ai/how-to/reduce-mttr-in-2026-from-alert-to-root-cause-in-minutes) |

第一阶段的所有工具调用限定为只读，智能体不接触任何写接口；第二阶段的产出是建议而非动作，缓解计划必须经值班工程师审批才能进入执行通道；第三阶段仅对预先评审过的低风险动作开放受控自动化，高风险动作（删除资源、修改配置、扩缩容）始终保留人工审批。三个阶段共同依赖第 4 章的 MCP 工具链与技能库持续扩充：每接入一个新数据源、每沉淀一个新技能，智能体的调查覆盖面同步扩展。

### 8.2 关键风险与应对

本方案识别出四类核心风险，每类风险都有对应的前文机制作为缓解手段：

**表9：关键风险与应对措施**

| 风险 | 潜在影响 | 应对措施 |
|------|----------|----------|
| 幻觉与错误建议 | 误判根因、给出加剧故障的操作 | 瑞士奶酪四层验证、混合智能降噪[komodor.com](https://komodor.com/blog/building-trust-in-the-machine-a-guide-to-architecting-agentic-ai-for-sre/) |
| 上下文饱和 | 海量遥测数据导致推理质量下降 | 子代理隔离上下文、传统 ML 预处理降噪[komodor.com](https://komodor.com/blog/building-trust-in-the-machine-a-guide-to-architecting-agentic-ai-for-sre/) |
| 误操作与越权 | 变更失控、敏感数据泄露 | 权限规则、中断审批、动态凭证、审计[langchain.com](https://docs.langchain.com/oss/python/deepagents/permissions) |
| 数据安全与供应链 | 检查点数据被利用、智能体读取敏感文件 | 反序列化类型白名单、敏感文件排除、密钥管理系统[langchain.com](https://docs.langchain.com/langsmith/evaluation-concepts) |

幻觉风险是四类风险中影响面最广的：LLM 的取悦倾向在聊天场景是特性，在 SRE 场景是缺陷，缺少护栏的智能体可能自信地推荐加剧故障的命令[komodor.com](https://komodor.com/blog/building-trust-in-the-machine-a-guide-to-architecting-agentic-ai-for-sre/)。因此本方案将验证体系的优先级置于功能扩展之上——能力扩张的每一阶段，都以该阶段的验证指标达标为前提。

治理层面的建议有四点。
第一，智能体的行动边界变更（新增写类工具、放宽审批范围）必须由 SRE 负责人与安全团队联合评审，不得由开发单方面决定。
第二，技能库的新增与修改走代码评审流程，防止错误排查步骤进入生产知识。
第三，审计日志的留存周期与访问权限按企业合规要求设定，智能体自身的工具调用记录不可被智能体修改。
第四，定期用新发生的真实事件校验评估基准的时效性，避免智能体在过时的基准上"虚假达标"。通过这四条治理规则与前文的技术机制协同，智能体在获得自动化效率的同时，始终运行在企业可控的信任边界之内。

## 核心参考文献

[pab1it0/prometheus-mcp-server:…](https://github.com/pab1it0/prometheus-mcp-server) · [Flux159/mcp-server-kubernetes](https://github.com/flux159/mcp-server-kubernetes) · [LangChain MCP Adapters](https://github.com/langchain-ai/langchain-mcp-adapters) · [A Guide to Architecting Agentic…](https://komodor.com/blog/building-trust-in-the-machine-a-guide-to-architecting-agentic-ai-for-sre/) · [Model Context Protocol (MCP) -…](https://docs.langchain.com/oss/python/langchain/mcp) · [Deep Agents overview - Docs by…](https://docs.langchain.com/oss/python/deepagents/overview) · [Building an end-to-end agentic…](https://aws.amazon.com/blogs/devops/building-an-end-to-end-agentic-sre-using-aws-devops-agent/) · [Permissions - Docs by LangChain](https://docs.langchain.com/oss/python/deepagents/permissions) · [Overview of Azure SRE Agent](https://learn.microsoft.com/en-us/azure/sre-agent/overview) · [Specification](https://agentskills.io/specification) · [langgraph.checkpoint.postgres](https://reference.langchain.com/python/langgraph.checkpoint.postgres) · [Persistence - Docs by LangChain](https://docs.langchain.com/oss/python/langgraph/persistence) · [Event streaming - Docs by LangC…](https://docs.langchain.com/oss/python/deepagents/event-streaming) · [Deep Agents: Open Source Agent…](https://www.langchain.com/deep-agents) · [AI SRE Architecture: Designing…](https://rootly.com/ai-sre-guide/architecture) · [Customize Deep Agents - Docs by…](https://docs.langchain.com/oss/python/deepagents/customization) · [permissions | deepagents](https://reference.langchain.com/python/deepagents/middleware/permissions) · [Guardrails for AI Agents: Types…](https://www.sweet.security/agent-security/guardrails-for-ai-agents) · [Agentic AI Guardrails: Enterpri…](https://tkxel.com/blog/agentic-ai-guardrails-framework/) · [Human-in-the-loop - Docs by Lan…](https://docs.langchain.com/oss/python/deepagents/human-in-the-loop) · [Structured model outputs | Open…](https://developers.openai.com/api/docs/guides/structured-outputs) · [Structured Output for Agents](https://docs.agno.com/input-output/structured-output/agent) · [How to Reduce MTTR: 6 Proven St…](https://www.sherlocks.ai/how-to/reduce-mttr-in-2026-from-alert-to-root-cause-in-minutes) · [How AI SRE Agent Reduces MTTR a…](https://komodor.com/learn/how-ai-sre-agent-reduces-mttr-and-operational-toil-at-scale/) · [Agentic AI for Automated Cloud…](https://www.cloudthat.com/resources/blog/agentic-ai-for-automated-cloud-incident-analysis/) · [astream_events | langchain_core](https://reference.langchain.com/python/langchain-core/runnables/base/Runnable/astream_events) · [Event streaming - Docs by LangC…](https://docs.langchain.com/oss/python/langgraph/event-streaming) · [Schema | Pydantic Docs](https://pydantic.dev/docs/validation/1.10/usage/schema/) · [Pydantic Response Model](https://notes.kodekloud.com/docs/Python-API-Development-with-FastAPI/Advanced-FastAPI/Pydantic-Response-Model/page) · [AsyncPostgresStore | langgraph.…](https://reference.langchain.com/python/langgraph.store.postgres/aio/AsyncPostgresStore) · [Evaluation concepts - Docs by L…](https://docs.langchain.com/langsmith/evaluation-concepts) · [Evaluation types - Docs by Lang…](https://docs.langchain.com/langsmith/evaluation-types) · [langgraph.store.postgres](https://reference.langchain.com/python/langgraph.store.postgres)
