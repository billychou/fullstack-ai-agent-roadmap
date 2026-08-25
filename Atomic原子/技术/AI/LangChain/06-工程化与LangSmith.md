---
tags:
  - AI
  - LangChain
  - LangSmith
  - 工程化
  - 部署
---

# 06 - 工程化与 LangSmith（生产级必学）

> 前置：[[05-LangGraph运行时]]。一个 Demo Agent 上线前要过五关：可观测、评测、部署、优化、安全。

## 一、流式输出（用户体验的基础）

```python
# Agent 级流式（前端打字机效果）
async for event in agent.astream_events(
    {"messages": [{"role": "user", "content": "分析这份报告"}]},
    version="v2",
):
    kind = event["event"]
    if kind == "on_chat_model_stream":
        print(event["data"]["chunk"].content, end="", flush=True)
```

## 二、LangSmith：Agent 的可观测性平台

### 为什么需要
Agent 是多步决策系统，出错位置难以定位：是检索错了？工具调用错了？还是模型推理错了？LangSmith 用 **Trace（追踪）** 把一次完整执行变成可视化时间线。

### 核心能力

| 能力 | 说明 |
|---|---|
| **Tracing** | 每次运行的可视化追踪：每个节点耗时、输入输出、token 用量 |
| **数据集评测** | 建测试集 → 批量跑 → 看准确率/得分，回归测试防退化 |
| **Prompt 管理** | Prompt Hub 版本管理、线上切换 |
| **Deployment** | LangServe 把 Agent 部署为 REST API |
| **LangSmith Engine** | 生产故障自动聚类 + 根因分析 + 修复建议（beta） |

### 接入（超简单，一行环境变量）

```python
import os
os.environ["LANGSMITH_TRACING"] = "true"
os.environ["LANGSMITH_API_KEY"] = "lsv2_..."
# 之后所有 agent.invoke() 自动被追踪，无需改代码
```

### 评测（Agent 测试的正确姿势）

```python
# 用数据集评测 Agent：定义打分函数
def correctness_evaluator(run, example):
    answer = run.outputs["messages"][-1].content
    expected = example.outputs["expected"]
    return {"key": "answer_match", "score": expected in answer}

# 在 LangSmith 平台创建数据集 → 关联 evaluator → 批量运行
```

**评测方法论**：
1. 先建 20~50 条高质量测试集（覆盖边界案例）
2. LLM-as-Judge 或规则打分作为 evaluator
3. 每次改 prompt/工具后跑一遍，防"改一处坏一片"
4. 生产反馈回流：线上 bad case 自动入库 → 补测试集 → 修复 → 回归

## 三、LangServe 部署

```python
# 把 Agent 变成 REST API
from langserve import add_routes
from fastapi import FastAPI

app = FastAPI(title="My Agent API")

agent = create_agent(model="claude-sonnet-4-6", tools=[get_weather], system_prompt="...")
add_routes(app, agent, path="/agent")   # POST /agent/invoke

# 启动：uvicorn main:app --host 0.0.0.0 --port 8000
# 自动获得：/invoke（同步）、/stream（流式）、/docs（Swagger）、Playground 调试页
```

**2026 部署趋势**：LangSmith Deployment 支持全托管 / Hybrid / 自托管，Agent 也可以部署到 LangGraph Platform。

## 四、性能与成本优化

| 手段 | 说明 | 收益 |
|---|---|---|
| **缓存** | 相同输入直接命中缓存，不调模型 | 省 60%+ 成本（重复问答场景） |
| **批处理** | `llm.batch()` 并发调用 | 吞吐 ↑ |
| **模型路由** | 简单问题用小模型，复杂问题用大模型 | 成本降 70% |
| **上下文精简** | 检索压缩、对话历史裁剪 | token 省 30%+ |
| **流式 + 首 token 快** | 小模型打头，体验先行 | 体感提速 |

```python
# 缓存示例
from langchain_core.caches import InMemoryCache
from langchain.globals import set_llm_cache

set_llm_cache(InMemoryCache())   # 生产可用 RedisCache

# 批处理
results = llm.batch([msg1, msg2, msg3])   # 并发
```

## 五、安全与合规（上线红线）

| 风险 | 对策 |
|---|---|
| **提示注入**（用户让模型"忘掉规则"） | 系统提示词加隔离；工具结果与用户输入分离标记 |
| **越权工具调用** | 关键工具加 `interrupt()` 人工审批；工具内校验权限 |
| **敏感数据泄露** | RAG 数据权限过滤（按用户/租户过滤后再检索）；日志脱敏 |
| **幻觉** | 强制引用来源；低置信度时拒绝回答 |
| **滥用/成本失控** | Rate Limit（限流）、单用户额度、异常模式监控 |
| **审计** | 全链路 Trace 落库，保留 tool_calls 与决策依据 |

## 六、生产架构参考（全貌）

```
用户 ──> 网关(鉴权/限流) ──> LangServe API
                              │
                 ┌────────────┼─────────────┐
                 ▼            ▼             ▼
            create_agent   LangGraph图   RAG检索
                 │            │             │
                 └────────────┼─────────────┘
                              ▼
                       LangSmith 全链路 Trace / 评测 / 告警
                              │
                              ▼
                   数据库(会话/审计/向量库) + 缓存(Redis)
```

## 七、本节小结

- **可观测**：LangSmith Trace 是排查 Agent 问题的第一工具（一行配置接入）
- **评测**：数据集 + evaluator + 回归，是 Agent 迭代的"测试用例"
- **部署**：LangServe 一行代码出 API；进阶用 LangSmith Deployment
- **优化**：缓存 / 路由 / 精简 三件套降本增效
- **安全**：注入防护、工具审批、权限过滤、审计，缺一不可

## 八、动手任务

1. 开启 LangSmith 追踪，跑一个多工具 Agent，观察 Trace 中每个节点的输入输出。
2. 建一个 10 条测试集，写一个 LLM-as-Judge evaluator，跑一次评测。
3. 用 LangServe 把 [[03-工具与Agent]] 里的旅行助手部署成 API，用 Swagger 调试。
4. 给 Agent 加缓存，对比命中/未命中时的延迟和费用。
5. 设计一个"提示注入攻击"测试用例，验证你的防护是否有效。
