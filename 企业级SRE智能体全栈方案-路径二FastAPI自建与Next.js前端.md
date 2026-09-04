# 企业级 SRE 智能体全栈方案（路径二：FastAPI + K8s 自建 + Next.js 前端）

**彻底解耦 LangSmith / LangGraph Platform 的全栈可执行设计**

**报告日期：2026年9月2日**

## 摘要

本方案在原企业级 SRE 智能体设计基础上做两处根本性调整：第一，部署路径切换为**路径二（FastAPI + Docker + K8s 完全自建）**，将 LangGraph/DeepAgents 作为纯 Python 库使用，彻底摆脱 LangSmith 控制平面与 LangGraph Platform 许可约束（无 License Key 启动验证、无节点执行次数上限），适配完全离线或信创环境；第二，新增 **Next.js 企业级前端**，补齐企业用户登录（Auth.js v5 + Keycloak OIDC）、三层 RBAC 权限管理、以及基于 Vercel AI SDK 的智能体执行流式聊天框三大能力。后端通过 AI SDK Data Stream Protocol 输出标准 SSE 事件流，前端 `useChat` 零配置消费，实时展示文本增量、工具调用过程与子代理进度，并通过 `tool-approval-request` 事件将人机协同审批直接内嵌到聊天界面。可观测性以自托管 Langfuse 替代 LangSmith。本文给出分层架构、API 协议、权限模型、流式协议对接、安全护栏与部署拓扑的完整设计。

## 1. 方案定位与路径选择依据

原方案默认配套 LangSmith 追踪与 LangGraph Platform 运行时。经核实，这两者在企业私有环境中存在约束：LangGraph Platform Standalone Server 启动时必须配置 `LANGSMITH_API_KEY` 和许可证密钥，并向 `beacon.langchain.com` 发起一次许可证验证，且免费 Lite 版每年限制 100 万次图内节点执行（注意是节点执行数而非 API 请求数）；超出额度需购买企业版授权，且 Lite 版不支持自定义认证等高级特性。

对完全物理隔离（Air-gapped）或信创环境，若无法获得官方 Air-gap 豁免，Standalone Server 无法启动。因此本方案选择**路径二：把 LangGraph/DeepAgents 视为纯 Python 库，用通用 Web 框架（FastAPI）自行封装运行时**，实现零外部依赖、无节点数上限、完全可控的私有化部署。

路径二需要自行实现 LangGraph Server 原本提供的能力，对应关系如下：

**表1：自建模块与 LangGraph Server 能力对应关系**

| 自建模块     | 对应 LangGraph Server 能力  | 技术选型                        | 注意事项                  |
| -------- | ----------------------- | --------------------------- | --------------------- |
| HTTP API | Agent Server REST API   | FastAPI + Uvicorn           | 需手动实现 SSE 流式响应        |
| 状态持久化    | PostgreSQL Checkpointer | Postgres / Redis            | 需自行序列化/反序列化 State     |
| 任务队列     | Redis Pub/Sub           | Celery / RQ / asyncio.Queue | 长时运行 Agent 必须异步化      |
| 会话管理     | Thread/Assistant API    | 自定义 Session 管理              | 需设计 TTL 与清理策略         |
| 认证鉴权     | LangSmith Auth          | OAuth2 / JWT / API Key      | Standalone Lite 版无此功能 |
| 速率限制     | 内置限流                    | 令牌桶 / Redis 滑动窗口            | 防止 LLM API 并发打爆       |

这一选择的代价是运维复杂度上升——状态管理、任务队列、鉴权都需要自研，但对强隔离、深度定制的企业场景而言，这是唯一能同时满足"完全离线"与"无执行上限"两个硬约束的路径。

## 2. 总体架构

整体采用前后端分离的分层架构，前端为 Next.js 应用，后端为 FastAPI 服务，中间通过标准 SSE 协议通信，底层为持久化存储与可观测性组件。

**表2：全栈组件清单**

| 层级 | 组件 | 职责 |
|------|------|------|
| 前端 | Next.js 16+（App Router） | 用户交互、登录、权限路由、流式聊天 |
| 认证 | Auth.js v5 + Keycloak | 企业 SSO（OIDC/SAML）、会话管理 |
| 网关 | Nginx / Ingress | TLS 终止、路由、限流 |
| 后端 | FastAPI + Uvicorn | Agent 编排、SSE 流式输出、审批回调 |
| 智能体 | LangGraph + DeepAgents（纯库） | 协调者—子代理编排、工具调用 |
| 持久化 | PostgreSQL | Checkpoint、Store、业务数据 |
| 缓存/队列 | Redis | 任务队列、Pub/Sub、限流计数 |
| 可观测性 | Langfuse（自托管） | Tracing、Eval、Prompt 管理 |
| 沙箱 | Docker / E2B / Modal | DeepAgents 代码执行隔离 |

数据流向：用户在 Next.js 聊天框输入 → 前端 `useChat` 发起 SSE 请求 → FastAPI 创建/恢复调查线程 → 协调者智能体编排子代理并行调查 → 后端按 AI SDK Data Stream Protocol 实时推送文本增量、工具调用、子任务进度事件 → 前端逐帧渲染 → 遇到高危操作时后端推送审批事件 → 前端渲染审批按钮 → 用户确认后回传 → 后端恢复执行。

## 3. 后端设计（FastAPI + LangGraph/DeepAgents）

### 3.1 项目结构

采用清晰的分层目录组织，将智能体逻辑、API 路由、协议适配与安全护栏分离：

```text
sre-agent-backend/
├── app/
│   ├── main.py                 # FastAPI 入口
│   ├── agent/
│   │   ├── orchestrator.py     # 协调者智能体（create_deep_agent）
│   │   ├── subagents/          # 观测/日志/基础设施/代码关联专家
│   │   ├── tools/              # MCP 工具封装
│   │   └── skills/             # SKILL.md 运维知识库
│   ├── api/
│   │   ├── chat.py             # SSE 流式聊天端点
│   │   ├── approval.py         # 审批回调端点
│   │   └── deps.py             # 依赖注入（认证、会话）
│   ├── protocol/
│   │   └── ai_stream.py        # AI SDK Data Stream Protocol 编码
│   ├── persistence/
│   │   ├── checkpointer.py     # PostgresSaver
│   │   └── store.py            # PostgresStore
│   └── guardrails/
│       ├── permissions.py      # FilesystemPermission 规则
│       └── interceptors.py     # 凭证注入与审计
├── Dockerfile
└── requirements.txt
```

### 3.2 智能体运行时初始化

智能体以纯库方式构建，持久化后端采用 PostgreSQL，确保人机协同中断可跨进程恢复：

```python
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.store.postgres import PostgresStore
from deepagents import create_deep_agent
from deepagents.middleware.permissions import FilesystemPermission

DB_URI = "postgresql://user:pass@postgres:5432/sre_agent"

# 持久化：线程状态 + 跨线程长期记忆
checkpointer = PostgresSaver.from_conn_string(DB_URI)
checkpointer.setup()          # 首次建表
store = PostgresStore.from_conn_string(DB_URI)
store.setup()

permissions = [
    FilesystemPermission(operations=["read", "write"],
                         paths=["/workspace/incidents/**"], mode="allow"),
    FilesystemPermission(operations=["read", "write"],
                         paths=["/etc/secrets/**", ".env"], mode="deny"),
    FilesystemPermission(operations=["write", "delete"],
                         paths=["/workspace/**"], mode="interrupt"),
]

agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-6",
    tools=mcp_tools,               # Prometheus/K8s MCP 工具
    permissions=permissions,
    interrupt_on={"execute": True},
)
graph = agent.compile(checkpointer=checkpointer, store=store)
```

初始化要点：首次使用必须调用 `setup()` 建表；手动传连接时必须带 `autocommit=True` 与 `row_factory=dict_row`；设置 `LANGGRAPH_STRICT_MSGPACK=true` 限制反序列化类型，防止数据库被入侵时触发代码执行；`thread_id` 控制在 255 字符内，建议用 UUID。

### 3.3 SSE 流式聊天端点

这是后端与前端的衔接核心。FastAPI 必须输出符合 **Vercel AI SDK Data Stream Protocol** 的事件流，前端 `useChat` 才能零配置消费。协议要求响应头包含 `x-vercel-ai-ui-message-stream: v1`，事件格式为 `data: {JSON}\n\n`，流结束标记为 `data: [DONE]`。

```python
from fastapi import FastAPI, Depends
from fastapi.responses import StreamingResponse
import json

app = FastAPI()

def sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

@app.post("/api/chat")
async def chat(payload: dict, session=Depends(require_session)):
    thread_id = payload["threadId"]
    message = payload["messages"][-1]["content"]

    async def event_stream():
        config = {"configurable": {"thread_id": thread_id}}
        async for event in graph.astream_events(
            {"messages": [{"role": "user", "content": message}]},
            config=config, version="v2"
        ):
            kind = event["event"]
            if kind == "on_chat_model_stream":
                yield sse({"type": "text-delta",
                           "id": "t1",
                           "delta": event["data"]["chunk"].content})
            elif kind == "on_tool_start":
                yield sse({"type": "tool-input-available",
                           "toolCallId": event["run_id"],
                           "toolName": event["name"],
                           "input": event["data"]["input"]})
            elif kind == "on_tool_end":
                yield sse({"type": "tool-output-available",
                           "toolCallId": event["run_id"],
                           "output": str(event["data"]["output"])})
            elif kind == "on_interrupt":
                # 高危操作 → 推送审批事件，前端渲染按钮
                yield sse({"type": "tool-approval-request",
                           "toolCallId": event["run_id"],
                           "toolName": event["name"],
                           "args": event["data"]})
                return  # 挂起，等待审批回调恢复
        yield sse({"type": "finish"})
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(), media_type="text/event-stream",
        headers={"x-vercel-ai-ui-message-stream": "v1",
                 "Cache-Control": "no-cache"})
```

### 3.4 审批回调与中断恢复

人机协同通过独立的审批端点闭环。前端用户点击"批准"后调用此端点，后端用 LangGraph 的 `Command(resume=...)` 恢复被中断的线程：

```python
from langgraph.types import Command

@app.post("/api/approval/{thread_id}")
async def approve(thread_id: str, decision: dict,
                  session=Depends(require_approver)):
    config = {"configurable": {"thread_id": thread_id}}
    if decision["approved"]:
        result = graph.invoke(Command(resume=decision), config=config)
    else:
        result = graph.invoke(Command(resume={"rejected": True}), config=config)
    return {"status": "resumed", "threadId": thread_id}
```

这一机制把原方案的"中断—审批—恢复"护栏直接内嵌到聊天交互中，值班工程师无需离开界即可完成高危操作授权，且每次审批都被记录进审计日志。

### 3.5 DeepAgents 自建场景的三个特殊考量

路径二下，DeepAgents 有三项能力需要自行补齐：

**沙箱执行**：DeepAgents 支持代码执行能力，生产环境必须使用容器化沙箱（Docker/E2B/Modal）隔离，禁止在主进程直接执行用户触发的代码，避免任意命令执行风险。

**文件系统后端**：需自行实现 Virtual Filesystem Backend（对接 S3/MinIO/NAS），替代默认的内存后端或 LangGraph Store 后端，确保调查证据、RCA 报告跨实例可见。

**Human-in-the-Loop**：LangGraph Server 内置的 HITL 协议在自建方案中需重新适配——本方案通过 3.3/3.4 的 `tool-approval-request` 事件与审批回调端点实现，效果等价但完全自主可控。

## 4. 前端设计（Next.js 企业级）

### 4.1 技术选型与版本基线

前端基于 Next.js 16+ 的 App Router。需要注意一个版本级变更：Next.js 16 已将 `middleware.ts` 正式重命名为 `proxy.ts`，并提供官方 codemod 迁移；认证采用 Auth.js v5（NextAuth v5），它原生支持 App Router、Edge Runtime 与严格 TypeScript 类型，推荐 JWT 策略以兼容 Edge Runtime 与 `proxy.ts` 的轻量鉴权。

### 4.2 企业登录：Auth.js v5 + Keycloak OIDC

Keycloak 是开源企业认证的首选身份源。集成时通过 `next-auth/providers/keycloak` 走 OIDC Discovery 自动发现端点，有三个必须实现的工程点：

**Token 静默刷新**：必须在 `jwt` callback 中实现 `refreshAccessToken`，处理 access_token 过期后的无感刷新，否则用户会话会在 token 过期后中断。

**角色提取**：在 `jwt` callback 中解析 access_token，从 `realm_access.roles` 或 `resource_access` 提取角色并注入 token，供后续 RBAC 使用。

**Session 类型扩展**：通过 TypeScript 声明合并扩展 `Session` 类型，把 `role`、`id` 等字段暴露给前端组件。

```typescript
// lib/auth.ts
import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Keycloak],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        // 从 access_token 提取角色
        token.roles = extractRoles(account.access_token);
      }
      // 过期则静默刷新
      if (Date.now() < (token.expiresAt ?? 0) * 1000) return token;
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.roles = token.roles;
      return session;
    },
  },
});
```

**安全红线**：无论使用 Keycloak、Okta 还是 Azure AD/Entra ID，`client_secret` 绝不能出现在前端代码中，Token 交换（code → token）必须在后端服务器内网完成。若企业需要对接多租户 SaaS 客户的异构 IdP，可用 SSOJet、Scalekit 等中间层抽象 SAML/OIDC 差异，避免为每个客户编写专属协议代码。Azure AD/Entra ID 推荐 OIDC 协议而非 SAML，配置更简单且支持 PKCE。

### 4.3 RBAC 权限管理：三层纵深防御

2026 年的 RBAC 最佳实践强调分层治理，避免把所有逻辑堆在单一层。本方案采用三层纵深防御模型：

**第一层：proxy.ts 路由守卫（网络边界）**。只做轻量级流量控制——检查 session cookie 是否存在、重定向未登录用户。禁止在此执行复杂 JWT 签名验证或数据库查询，那会拖垮 Edge Runtime。

```typescript
// proxy.ts (Next.js 16+)
import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const session = await auth();
  if (!session && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}
```

**第二层：Server Components 页面级鉴权**。在服务端组件中调用 `await auth()` 做细粒度角色检查，这是渲染敏感 UI 前的最后一道防线。例如 `/approvals` 审批页只允许 `sre-approver` 角色访问。

**第三层：Data Access Layer 资源级隔离**。这是最关键的安全层——所有数据查询必须强制过滤 `organizationId`，防止越权访问。用 `ROLE_PERMISSIONS` 映射表定义角色权限，避免硬编码；封装 `requireOrgPermission` 辅助函数在 Server Actions 和 API Routes 中统一调用，同时校验成员资格与具体权限。

```typescript
// lib/org-auth.ts
export async function requireOrgPermission(orgSlug: string, permission: Permission) {
  const membership = await getOrgMembership(orgSlug);
  if (!membership) throw new Error("Not a member");
  if (!hasPermission(membership.role, permission)) {
    throw new Error(`Insufficient permissions: requires ${permission}`);
  }
  return membership; // organizationId 已绑定，供后续查询使用
}
```

针对 SRE 场景，建议定义四个角色：`viewer`（只读看板）、`investigator`（发起调查、查看 RCA）、`approver`（审批高危操作）、`admin`（管理技能库与权限）。审批端点 `/api/approval/*` 在后端同样校验 `approver` 角色，前后端双重校验。

### 4.4 流式聊天框：Vercel AI SDK useChat

前端消费后端 SSE 流无需任何特殊配置，`useChat` 默认使用 Data Stream Protocol：

```tsx
'use client';
import { useChat } from '@ai-sdk/react';

export default function SreChat() {
  const { messages, sendMessage, data, status } = useChat({
    api: '/api/chat',   // 经 Next.js 转发到 FastAPI
  });

  return (
    <div className="chat-container">
      {messages.map(m => (
        <MessageBubble key={m.id} message={m} />
      ))}
      {/* data 数组包含所有 data-* 自定义事件，如子任务进度 */}
      {data && <ProgressPanel data={data} />}
    </div>
  );
}
```

**工具调用流式化**：AI SDK 5+ 默认流式传输工具调用输入。后端发送 `tool-input-delta` 时，前端 `messages[].parts` 中对应 tool part 的 `state` 变为 `"input-streaming"`，UI 可渲染参数生成动画；`tool-output-available` 到达后展示工具结果。这让值班工程师实时看到智能体正在查哪个指标、执行哪条 kubectl 命令。

**子任务进度展示**：用 `data-*` 自定义事件推送子代理进度。后端发送 `{"type": "data-progress", "data": {"step": 3, "total": 10}}`，前端通过 `useChat` 的 `data` 属性或 message parts 中的 `data-progress` 类型捕获并渲染进度条。配合原方案的 `stream.subagents` 机制，可把观测、日志、基础设施、代码关联四个专家子代理的执行状态实时映射到前端进度面板。

**审批内嵌**：后端推送 `tool-approval-request` 事件时，前端渲染审批卡片（含影响面分析报告与批准/拒绝按钮）；用户确认后前端发送 `tool-approval-response`，后端恢复执行并继续推送后续事件。整个高危操作授权闭环在聊天界面内完成。

Vercel 官方提供了 `ai-sdk-python-streaming` 模板，演示 FastAPI + Next.js + useChat 的端到端集成，可作为起步脚手架。

## 5. 前后端流式协议对接规范

为保证前后端事件对齐，明确各事件类型的发送顺序与语义：

**表3：AI SDK Data Stream Protocol 事件映射**

| 事件类型 | 触发时机 | 前端渲染 |
|----------|----------|----------|
| `start` / `finish` | 消息开始/结束 | 消息气泡生命周期 |
| `text-start` / `text-delta` | 文本生成开始/增量 | 打字机效果 |
| `tool-input-start` / `tool-input-delta` / `tool-input-available` | 工具参数生成 | 工具调用卡片（参数动画） |
| `tool-output-available` | 工具执行完成 | 展示工具结果 |
| `tool-approval-request` | 命中高危操作中断 | 审批按钮卡片 |
| `tool-approval-response` | 用户确认（前端→后端） | 恢复执行 |
| `data-progress` | 子代理进度更新 | 进度条/子任务面板 |

协议硬性要求：响应头必须含 `x-vercel-ai-ui-message-stream: v1`；每帧格式 `data: {JSON}\n\n`；流结束发 `data: [DONE]`；工具调用事件必须按 `tool-input-start → tool-input-delta → tool-input-available → tool-output-available` 顺序发送，乱序会导致前端状态机错乱。

后端有三种实现路径可选：Pydantic AI 的 `VercelAIAdapter`（生产推荐，原生支持协议自动转换）、社区库 `ai-sdk-stream-python`（快速集成）、或手写 SSE 帧（学习/深度定制）。本方案 3.3 采用手写方式以便完全控制事件语义，生产可切换为 adapter 降低维护成本。

## 6. 安全护栏（自建场景强化）

路径二下没有 LangGraph Server 内置的鉴权与限流，需自行落实六层护栏：

**表4：自建场景六层安全护栏**

| 层级 | 机制 | 实现位置 |
|------|------|----------|
| 网络边界 | proxy.ts 路由守卫 + Ingress 限流 | Next.js / K8s |
| 认证 | Auth.js v5 + Keycloak OIDC，JWT 校验 | Next.js + FastAPI 双重 |
| 授权 | 三层 RBAC，审批端点校验 approver 角色 | 前后端双重 |
| 智能体权限 | FilesystemPermission 路径规则 + interrupt | DeepAgents |
| 凭证 | tool_interceptors 从密钥管理系统动态注入，不落盘 | FastAPI |
| 审计 | 全量工具调用与推理步骤日志 | FastAPI + Langfuse |

额外强调三点：第一，`client_secret`、模型 API Key、K8s 凭证一律存于密钥管理系统（Vault/Sealed Secrets），通过环境变量或拦截器注入，绝不进前端或镜像层；第二，DeepAgents 代码执行必须走容器沙箱；第三，SSE 端点同样要校验 JWT，不能因为是流式接口就跳过鉴权。

## 7. 可观测性：Langfuse 替代 LangSmith

不部署 LangSmith 意味着失去原生 Tracing/Eval，用自托管开源方案补齐：

**表5：可观测性替代方案对比**

| 工具 | 开源协议 | 核心特点 | 适用场景 |
|------|----------|----------|----------|
| Langfuse | MIT | Tracing/Eval/Prompt 管理，ClickHouse 后端可 SQL 直查，Docker 一键自托管，提供 LangChain Callback Handler | 首选，LangSmith 最直接替代 |
| Arize Phoenix | 开源 | Tracing + Eval + Prompt 漂移监控一体化 | 需评估闭环与漂移监控 |
| OpenLLMetry | Apache 2.0 | 基于 OpenTelemetry，导出至 Jaeger/Grafana/Datadog | 已有 APM 基础设施，追求厂商中立 |
| Helicone | 开源 | API Proxy 模式，零代码改动记录调用 | 专注成本/延迟监控 |
| MLflow | Apache 2.0 | 实验管理 + 模型注册 + 自定义指标 | Notebook 驱动、重代码控制 |

**集成建议**：Tracing 层优先 Langfuse 或 Phoenix——它们对 LangGraph 图结构有专门可视化，优于通用 APM；只需在智能体初始化时挂载 Callback Handler，几行代码接入且零性能损耗。Metrics 层结合 Prometheus + Grafana 采集 FastAPI 暴露的系统级指标（Token 消耗、延迟 P99、队列深度）。Eval 层用 RAGAS 或 Phoenix 的 Eval 模块做离线评估，替代 LangSmith 的 Dataset/Evaluator。原方案第 7 章的 RCA 准确率、缓解计划安全性评估指标，可平移到 Langfuse/Phoenix 的评估器上继续运转。

## 8. 部署架构（Docker + Kubernetes）

### 8.1 容器化最佳实践

**基础镜像**：推荐 `python:3.10-slim` 减小攻击面与体积。**依赖锁定**：必须用 `pip freeze > requirements.txt` 固定版本，避免 LangChain 0.x→1.x 升级导致 API 破坏。**多阶段构建**：分离构建层与运行层，设置 `PYTHONUNBUFFERED=1` 确保日志实时输出。**健康检查**：暴露 `/health` 端点供 K8s Liveness/Readiness Probe 使用，避免僵尸进程。

```dockerfile
FROM python:3.10-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.10-slim
WORKDIR /app
COPY --from=builder /install /usr/local
COPY app ./app
ENV PYTHONUNBUFFERED=1
EXPOSE 8000
HEALTHCHECK CMD curl -f http://localhost:8000/health || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 8.2 Kubernetes 拓扑

生产环境用 K8s 编排，核心工作负载与依赖如下：

**表6：K8s 部署清单**

| 工作负载 | 类型 | 副本/规格 | 依赖 |
|----------|------|-----------|------|
| sre-agent-api（FastAPI） | Deployment | ≥2 副本，HPA 按 CPU/QPS 扩缩 | PostgreSQL、Redis |
| sre-agent-worker（长任务） | Deployment | 独立于 API，处理长时调查 | Redis 队列 |
| nextjs-frontend | Deployment | ≥2 副本 | Keycloak、sre-agent-api |
| keycloak | StatefulSet | 企业认证身份源 | PostgreSQL |
| postgresql | StatefulSet | Checkpoint/Store/业务数据 | 持久卷 |
| redis | StatefulSet | 队列/Pub-Sub/限流 | 持久卷 |
| langfuse | Deployment | 可观测性 | ClickHouse、PostgreSQL |
| 沙箱执行器 | 按需 Job/Pod | DeepAgents 代码执行隔离 | 镜像仓库 |

关键设计：API 与 Worker 分离——SSE 流式响应由 API 副本承担，长时调查任务丢进 Redis 队列由 Worker 异步执行，避免长任务占满 API 连接。Ingress 统一做 TLS 终止、路由与限流。所有 StatefulSet 挂载持久卷，PostgreSQL 开启定期备份。

### 8.3 网络与隔离

前端、后端、存储分属不同命名空间，用 NetworkPolicy 限制东西向流量；SSE 连接经 Ingress 时需调大 `proxy-read-timeout` 以支持长连接；完全离线环境下，所有镜像预拉取至私有仓库，Helm Chart 与依赖包离线分发。

## 9. 实施路线图

延续原方案"只读调查—建议生成—受控自动化"的信任递进逻辑，叠加前后端工程里程碑：

**表7：分阶段实施计划**

| 阶段 | 范围 | 交付物 | 晋级标准 |
|------|------|--------|----------|
| 阶段 0：基础设施 | K8s 集群、PostgreSQL、Redis、Keycloak、Langfuse | 底座环境 | 各组件健康检查通过 |
| 阶段 1：只读调查 | FastAPI + 只读协调者/子代理、Langfuse 接入、Next.js 登录 + 流式聊天（只读） | 前后端打通的调查界面 | SSE 流稳定、RCA 准确率达标 |
| 阶段 2：建议生成 | 结构化缓解计划、审批闭环（tool-approval）、RBAC 三层权限 | 内嵌审批的聊天界面 | 影子模式结论一致性达标 |
| 阶段 3：受控自动化 | 低风险动作受控执行、沙箱、效果验证、知识回写 | 全闭环流程 | 生产 MTTR/噪声达标 |

阶段 1 的关键验收是前后端 SSE 链路稳定——文本增量、工具调用、子任务进度三类事件都能实时渲染，这是后续所有交互能力的地基。

## 10. 关键风险与应对

**表8：路径二特有风险与应对**

| 风险 | 潜在影响 | 应对措施 |
|------|----------|----------|
| 运行时能力自建不完整 | 缺 Checkpoint/Stream/HITL 导致体验降级 | 按表1 逐项自研并集成测试 |
| SSE 长连接中断 | 调查过程前端失联 | Ingress 超时调优 + 断线重连 + thread_id 恢复 |
| 长任务阻塞 API | 高并发下流式响应卡顿 | API/Worker 分离 + 任务队列 |
| 前后端鉴权不一致 | 越权访问审批或数据 | 前后端双重校验 + 资源级过滤 |
| 依赖版本漂移 | LangChain 升级破坏 API | 依赖锁定 + 镜像版本固定 |
| 沙箱逃逸 | 代码执行危及主进程 | 容器沙箱隔离 + 最小权限 |

路径二的本质是"用运维复杂度换完全自主可控"。对强隔离、超大规模、深度定制的企业场景，这是唯一能同时满足完全离线与无执行上限的路径；代价是状态管理、任务队列、鉴权、HITL 都需自建并持续维护，团队需具备相应的后端工程能力。

## 核心参考文献

[Self-host standalone servers - Docs by LangChain](https://docs.langchain.com/langsmith/deploy-standalone-server) · [LangGraph Platform in beta: New deployment options](https://www.langchain.com/blog/langgraph-platform-announce) · [Langgraph standalone container 1 million nodes execution limit - LangChain Forum](https://forum.langchain.com/t/langgraph-standalone-container-1-million-nodes-execution-limit/484) · [LangGraph Platform Pricing and Auth - Reddit](https://www.reddit.com/r/LangChain/comments/1kn4ews/langgraph_platform_pricing_and_auth/) · [Self-hosting LangGraph agents independently without LangSmith - Latenode](https://community.latenode.com/t/self-hosting-langgraph-agents-independently-without-langsmith-integration/33746) · [LangSmith alternative - Langfuse](https://langfuse.com/faq/all/langsmith-alternative) · [Open source LangSmith alternative: Arize Phoenix](https://arize.com/docs/phoenix/resources/frequently-asked-questions/open-source-langsmith-alternative-arize-phoenix-vs.-langsmith) · [Reviewing the major LangSmith alternatives](https://dev.to/mjordan/reviewing-the-major-langsmith-alternatives-1gf2) · [Auth.js v5 with Next.js 16: The Complete Authentication Guide](https://dev.to/huangyongshan46a11y/authjs-v5-with-nextjs-16-the-complete-authentication-guide-2026-2lg) · [Add Authentication to Your Next.js App with Keycloak](https://skycloak.io/blog/keycloak-nextjs-app-router-authentication/) · [Add Enterprise SSO to Next.js with Auth.js - Scalekit](https://docs.scalekit.com/cookbooks/add-enterprise-sso-nextjs-authjs/) · [How to Add Enterprise SSO to a Next.js App (SAML + OIDC)](https://ssojet.com/blog/how-to-add-enterprise-sso-to-a-next-js-app-saml-oidc-guide) · [Renaming Middleware to Proxy - Next.js Docs](https://nextjs.org/docs/messages/middleware-to-proxy) · [Multi-tenant SaaS Architecture in Next.js: Organizations, Roles, and Resource Isolation](https://dev.to/whoffagents/multi-tenant-saas-architecture-in-nextjs-organizations-roles-and-resource-isolation-1n91) · [Vercel AI SDK UI Stream Protocol](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol) · [Vercel AI Data Stream Protocol - Pydantic Docs](https://pydantic.dev/docs/ai/integrations/ui/vercel-ai/) · [AI SDK 5 - Vercel Blog](https://vercel.com/blog/ai-sdk-5) · [Human-in-the-Loop AI Agents - AI SDK Cookbook](https://ai-sdk.dev/cookbook/next/human-in-the-loop) · [AI SDK Python Streaming Template - Vercel](https://vercel.com/templates/next.js/ai-sdk-python-streaming)
