---
tags:
  - AI
  - LangChain
  - Agent
  - 工具
---

# 03 - 工具与 Agent（create_agent 全解）

> 前置：[[02-模型与消息]]。本篇是 LangChain 1.x 的核心 —— `create_agent`。

## 一、工具（Tools）：把函数暴露给模型

**工具的三种写法：**

```python
# 1. @tool 装饰器（最常用）：函数即工具
from langchain_core.tools import tool

@tool
def get_weather(city: str) -> str:
    """查询指定城市的天气。参数：city 城市名。"""
    return "晴，28℃"   # 实际应调用天气 API

# 2. 带类型与描述的 Pydantic 风格（生产推荐）
from typing import Annotated

@tool
def book_flight(
    origin: Annotated[str, "出发城市"],
    dest: Annotated[str, "到达城市"],
    date: Annotated[str, "日期 YYYY-MM-DD"],
) -> str:
    """预订航班。返回预订确认信息。"""
    return f"已预订 {origin} → {dest} ({date})"

# 3. 把一个类的多个方法批量转成工具（封装 API 客户端）
# from langchain_core.tools import BaseTool  # 需要更复杂逻辑时
```

**核心规则（模型靠这三样理解工具）：**
1. **函数名** → 工具 ID（要语义清晰）
2. **docstring** → 工具说明（模型据此决定何时用）
3. **参数签名 + 类型注解 + Annotated 描述** → 参数 Schema

> 工具描述写得好不好，直接决定模型调用准确率。这是 Prompt 工程在 Agent 时代的延伸。

## 二、create_agent：1.x 的核心原语

```python
from langchain.agents import create_agent

agent = create_agent(
    model="claude-sonnet-4-6",          # 必填：模型名或 ChatModel 实例
    tools=[get_weather, book_flight],   # 必填：工具列表
    system_prompt="你是一个旅行助手，帮用户查询天气和预订航班。",  # 系统提示词
    state=...,                          # 可选：自定义状态 Schema（默认是消息列表）
    middleware=[...],                   # 可选：中间件（日志、限流、权限）
)
```

**调用方式（统一的消息列表接口）：**

```python
result = agent.invoke({"messages": [{"role": "user", "content": "明天北京天气如何？"}]})
print(result["messages"][-1].content)  # 取最后一条 AI 消息

# 流式
# for chunk in agent.stream({...}): ...
```

**create_agent 内部帮你做了什么**（理解这一点很重要）：
1. 构建一个 **LangGraph 图**：`START → Agent节点 ⇄ 工具节点`（ReAct 循环）
2. Agent 节点 = 模型 + system_prompt + tools（自动 `bind_tools`）
3. 工具节点 = 根据 `tool_calls` 分派执行，结果回喂
4. 循环直到模型输出不含 `tool_calls`（任务完成）

## 三、Agent 循环原理（ReAct 模式）

```
用户提问
   │
   ▼
┌──────────┐  需要工具？   ┌──────────┐
│ Agent节点 │ ──────────> │ 工具节点   │
│ (LLM推理) │ <────────── │ (执行工具) │
└──────────┘  结果回喂     └──────────┘
   │
   │ 不需要工具（直接回答）
   ▼
  输出最终答案
```

- **ReAct** = Reason + Act：模型先"思考"（隐含在 prompt 中），再"行动"（调用工具），观察结果后继续思考，直到能回答。
- 这是 2026 年所有主流 Agent 框架（LangChain、OpenAI、Claude Agent SDK）的通用底层模式。
- 老教程里的 `AgentExecutor`（0.x）已废弃，1.x 统一走 `create_agent`。

## 四、多工具与工具选择策略

**模型如何选择工具？** 把每个工具的 JSON Schema 放进 prompt，模型根据问题语义 + 工具描述做"函数路由"。

```python
# 多工具 Agent：模型会自主决定调用哪个/调几个
agent = create_agent(
    model="claude-sonnet-4-6",
    tools=[
        get_weather,      # 天气
        book_flight,      # 订机票
        search_hotel,     # 查酒店
        recommend_route,  # 推荐行程
    ],
    system_prompt="你是旅行规划师，先查天气，再按用户预算推荐行程，最后可协助订票。",
)
```

**提升工具调用准确率的实践：**
1. 工具数量别太多（<10 个优先），太多模型会"选择困难"
2. 描述写清**边界**："仅在用户明确要求预订时调用，不要主动下单"
3. 同名能力（如多个"搜索"）会造成混淆，工具职责要单一
4. 关键操作（下单、付款、删除）**不要**让 Agent 自动执行 —— 用 LangGraph `interrupt()` 加人工确认（见 [[06-LangGraph运行时]]）

## 五、system_prompt 的重要性

在 1.x，`create_agent` 的 `system_prompt` 承担了 0.x 时代"Prompt 模板 + 角色设定"的所有职责。**Agent 的行为质量，大半取决于这一句话：**

```python
system_prompt = """
你是一个严谨的金融数据分析助手。

规则：
1. 所有数据结论必须标注来源和时间
2. 涉及具体数字时，先调用工具核实，禁止凭记忆编造
3. 用户问"推荐股票"时，必须提示风险并拒绝具体荐股
4. 回答使用中文，简洁专业，重点用要点列出

工具使用：
- 查询行情用 quote 工具
- 查财报用 financials 工具
- 不确定用什么工具时，询问用户澄清
"""
```

## 六、Middleware（中间件）：1.x 新增的扩展点

```python
# 中间件在 Agent 每次迭代前后执行，适合横切关注点
from langchain.agents import create_agent

def log_middleware(params):
    print(f"[调用] 模型={params.model}, 工具={params.tools}")
    return params

agent = create_agent(
    model="claude-sonnet-4-6",
    tools=[get_weather],
    system_prompt="...",
    middleware=[log_middleware],  # 日志、审计、限流、权限校验
)
```

## 七、本节小结

| 概念 | 要点 |
|---|---|
| `@tool` | 函数 → 工具，靠名字/docstring/签名让模型理解 |
| `create_agent` | 1.x 唯一入口，内部构建 LangGraph 图 |
| ReAct 循环 | 推理→行动→观察，直到能回答 |
| 工具选择 | 模型做函数路由，靠描述质量 |
| system_prompt | Agent 行为质量的决定性因素 |
| middleware | 日志/审计/限流等横切关注点 |

## 八、动手任务

1. 写 3 个工具（天气、汇率换算、待办清单），组装一个多工具 Agent。
2. 故意给工具一个模糊描述，观察模型调用错误，然后改描述重试 —— 体会描述的重要性。
3. 用 `agent.stream()` 观察多工具场景下消息序列，理解 ReAct 循环过程。
4. （挑战）不用 create_agent，用 `bind_tools` + 手写循环实现同样的 Agent —— 理解框架替你做了什么。
