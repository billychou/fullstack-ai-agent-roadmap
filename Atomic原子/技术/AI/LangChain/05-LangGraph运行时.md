---
tags:
  - AI
  - LangChain
  - LangGraph
  - Agent
---

# 05 - LangGraph 运行时（从 create_agent 到自定义状态机）

> 前置：[[03-工具与Agent]]。衔接《全栈学习路线》[[W03-LangGraph入门]] / [[W04-LangGraph进阶]]。
> **核心认知**：`create_agent` 底层就是一张 LangGraph 图。当标准 Agent 循环不够用时，直接画图。

## 一、为什么需要 LangGraph

`create_agent` 解决"标准问答 Agent"，但真实业务有更多需求：

- 流程不是简单循环：先分类 → 再分流 → 最后审批
- 需要**持久化状态**（会话中断后恢复、跨请求记忆）
- 需要**人工介入**（关键操作审批、纠错）
- 需要**多 Agent 分工协作**
- 需要**并行分支**（同时检索多个数据源）

这些都需要显式的图编排 —— 这就是 LangGraph。

## 二、核心概念（五分钟看懂）

```python
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, START, END

# 1. 定义状态（整张图共享的数据结构）
class State(TypedDict):
    messages: list          # 对话消息
    intent: str             # 分类结果
    ticket_id: str | None   # 工单号

# 2. 定义节点（每个节点是一个处理函数）
def classify(state: State) -> State:
    """第一步：判断用户意图"""
    return {"intent": "退款"}     # 返回 dict，更新状态

def refund(state: State) -> State:
    """退款分支"""
    return {"messages": state["messages"] + ["已发起退款流程"]}

def support(state: State) -> State:
    """技术支持分支"""
    return {"messages": state["messages"] + ["已转接技术支持"]}

# 3. 构建图：节点 + 边
builder = StateGraph(State)
builder.add_node("classify", classify)
builder.add_node("refund", refund)
builder.add_node("support", support)

# 4. 连线：START → classify → 条件分支
builder.add_edge(START, "classify")
builder.add_conditional_edges(
    "classify",
    lambda state: "refund" if state["intent"] == "退款" else "support",  # 路由函数
    {"refund": "refund", "support": "support"},
)
builder.add_edge("refund", END)
builder.add_edge("support", END)

# 5. 编译运行
graph = builder.compile()
result = graph.invoke({"messages": [], "intent": "", "ticket_id": None})
```

**四个要素**：
| 要素 | 作用 |
|---|---|
| **State** | 图的共享状态（TypedDict 或 Pydantic），节点间传递 |
| **Node** | 处理函数，输入 State 输出 State 的部分更新 |
| **Edge** | 节点间的连接（顺序边 / 条件边） |
| **循环** | 边可以指回前序节点 → 形成 Agent 循环 |

## 三、从 create_agent 到自定义图（渐进式）

**方式一：create_agent 直接进图（推荐起点）**

```python
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langchain.agents import create_agent

# agent 本质是可调用的图节点
agent = create_agent(model="claude-sonnet-4-6", tools=[get_weather])

builder = StateGraph(State)
builder.add_node("agent", agent)          # 把 agent 当节点
builder.add_edge(START, "agent")
builder.add_edge("agent", END)
```

**方式二：prebuilt 组件（常用脚手架）**

```python
from langgraph.prebuilt import create_react_agent

# 标准 ReAct Agent，等价于 create_agent 的底层实现
agent = create_react_agent(model, tools)
```

**方式三：完全自定义**（如上节示例）—— 需要精细控制时才这么做。

## 四、Checkpointer：持久化与断点续跑

默认图是无状态的一次性执行。加上 Checkpointer 后，状态会被持久化到数据库，可跨请求恢复：

```python
from langgraph.checkpoint.memory import InMemorySaver

# 内存版（学习用）
checkpointer = InMemorySaver()
graph = builder.compile(checkpointer=checkpointer)

# 生产用 SQLite/Postgres
# from langgraph.checkpoint.sqlite import SqliteSaver
# checkpointer = SqliteSaver.from_conn_string("checkpoints.sqlite")

# 运行并保存状态到指定 thread_id
result = graph.invoke(
    {"messages": [], "intent": "", "ticket_id": None},
    config={"configurable": {"thread_id": "user-42"}},   # 会话 ID
)

# 同一 thread 继续对话（状态自动恢复）
result2 = graph.invoke({"messages": ["接着说"]}, config={"configurable": {"thread_id": "user-42"}})
```

**Checkpointer 带来的三大能力：**
1. **持久化**：会话状态存库，重启不丢（thread_id 即会话 ID）
2. **断点续跑**：执行中途崩溃，可从检查点恢复
3. **Time-travel 调试**：回放任意历史状态，重跑后续流程（LangSmith 中可视化）

## 五、Human-in-the-loop（人工介入）

**为什么需要**：付款、删除、发布等高风险操作不能让 Agent 自动执行。

```python
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt

def confirm_payment(state: State) -> State:
    """执行支付前，暂停等待人工确认"""
    approved = interrupt({                       # 暂停图执行
        "type": "payment_approval",
        "amount": state["amount"],
        "to": state["to"],
    })
    if not approved:                             # 人工拒绝
        return {"messages": state["messages"] + ["支付已取消"]}
    return {"messages": state["messages"] + [f"已支付 {state['amount']}"]}

# 调用时：
# 1. 第一次 invoke → 图在 interrupt 处暂停，返回待审批信息
# 2. 人工在前端审批
# 3. 用 graph.invoke(Command(resume=True/False), config=...) 恢复执行
```

**典型模式**：`interrupt()` 暂停 → 审批 → `Command(resume=...)` 恢复。这是生产 Agent 的关键安全机制。

## 六、多 Agent 协作（三大模式）

| 模式 | 结构 | 适用 |
|---|---|---|
| **Orchestrator-Worker** | 主 Agent 分配任务给多个 Worker | 任务可拆分成独立子任务 |
| **Supervisor** | 监督者 Agent 决定交给哪个子 Agent | 需要路由到专业 Agent |
| **Swarm（蜂群）** | Agent 间平级互相移交（handoff） | 角色频繁切换 |

```python
# Supervisor 模式骨架
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import create_react_agent

researcher = create_react_agent(model, tools=[search_tool])
writer = create_react_agent(model, tools=[write_tool])

def supervisor(state):
    # LLM 决定：交给 researcher / writer / 结束
    ...

builder = StateGraph(State)
builder.add_node("supervisor", supervisor)
builder.add_node("researcher", researcher)
builder.add_node("writer", writer)
# ... 用条件边实现路由循环
```

> 多 Agent 详细设计见 [[W07-多Agent协作]]。**建议**：能单 Agent 解决的别上多 Agent，复杂度会指数上升。

## 七、生产级选型速查

| 需求 | 方案 |
|---|---|
| 标准问答 Agent | `create_agent` 就够了 |
| 会话记忆跨请求 | Checkpointer（thread_id） |
| 自定义分支流程 | StateGraph 手画 |
| 关键操作审批 | `interrupt()` + `Command(resume)` |
| 崩溃恢复 | Checkpointer + 重试 |
| 多 Agent | Supervisor / Swarm 模式 |
| 监控调试 | 接 LangSmith（[[07-工程化与LangSmith]]） |

## 八、本节小结

```
create_agent（标准循环）
      ↓ 不够用时
StateGraph（画图：State + Node + Edge）
      ↓ 需要持久化
+ Checkpointer（thread_id）
      ↓ 需要人工
+ interrupt() / Command(resume)
      ↓ 需要分工
+ 多 Agent 模式（Supervisor / Swarm）
```

## 九、动手任务

1. 用 StateGraph 实现"客服工单"流程：分类 →（退款/技术支持/投诉）分支 → 结束。
2. 给上面的图加 Checkpointer，验证同一 thread_id 二次调用能恢复状态。
3. 在支付节点加 `interrupt()`，实现"先暂停 → 人工确认 → 恢复"的完整流程。
4. 实现 Supervisor 模式：研究 Agent + 写作 Agent 协作完成一篇报告。
5. 对比 `create_agent` 和手写 StateGraph 的代码量，总结什么场景用哪个。
