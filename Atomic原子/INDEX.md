---
tags:
  - 索引
status: index
---

# 📇 我的笔记索引

> 个人笔记库入口。教程内容在 `全栈学习路线/`（[[README|README]]）。
> 底部「自动索引」由 Dataview 插件渲染，新建笔记会自动出现。

## 💼 工作

### 中原银行
- [[基建]] — 运维指标与告警数据治理、多智能体根因定位
- [[应急管理平台-自动更新预案推荐和事件影响]] — Multi-Agent RCA 故障根因分析，覆盖告警压缩/摘要/预案推荐/定位架构师等智能体

### 产品设计
- [[SAAS设计]] — SaaS 系统通用功能模块清单（租户/权限/计费/集成/安全/管理后台）
- [[业务会话表设计]] — LangGraph Checkpointer 与业务会话表分离设计
- [[AI应用开发]] *(待补充)*

## 🐍 技术

### Python
- [[Flask信号与Blinker]] — Flask 信号机制（发布/订阅）
- [[celery应用]] — Celery 任务流程与依赖构成
- [[Celery架构]] — Celery 五层架构速览
- [[Redis 列表（List）常用命令]] — List 命令速查表
- [[dbm]] — 标准库轻量键值数据库
- [[uv]] — uv 常用命令备忘

### 运维
- [[域控]] — Windows AD `logonHours` 用户登录时间段控制（ldap3 示例）

### AI / LangChain
- [[00-学习大纲]] — LangChain 1.x 深度学习大纲（8 阶段路线 + 进度追踪）
- [[01-生态全景与1.0重构]] — LangChain/LangGraph/LangSmith 三件套关系与 1.0 变更
- [[02-模型与消息]] — Chat Models、消息类型、Prompt、工具调用、结构化输出
- [[03-工具与Agent]] — `@tool`、`create_agent`、ReAct 循环原理
- [[04-RAG检索增强生成]] — RAG 五步链路与进阶技巧（Rerank/Hybrid）
- [[05-LangGraph运行时]] — StateGraph、Checkpointer、HITL、多 Agent 模式
- [[06-工程化与LangSmith]] — 可观测、评测、LangServe 部署、安全
- [[07-实战项目]] — 知识库问答 / 个人助理 / 工单多 Agent 三个递进项目
- [[deepseek-harness学习指南]] — DeepSeek Harness（dsh）系统学习指南：原理架构 / 上手实践 / 插件生态 / 趋势分析
- [[deepseek-harness实践]] — dsh 本地源码安装与试用实录（pnpm 构建全流程）
- [[Agent工程师12步路线图]] — @0xCodez 七大支柱（Context/Tools/Memory/Loops/Graphs/Harness/Evals）12 步成长路线（2026 译文摘录）
- [[Ralph Loop：一切皆循环]] — Geoffrey Huntley：从搭积木到编程循环，单体 Agent + Watch the loop + 演化式软件工厂（2026 译文摘录）
- [[软件工程AI学习规划]] — 个人课程规划：AI 增强开发工作流四阶段 14 周（软件工程三支柱 → Agent 工作流 → 可靠性 → 毕业项目）

## 🌱 生活

### 健康
- [[减肥]] — 目标：2026-10-01 前体重 ≤ 60KG

### 随笔
- [[AI感悟]] — 大厂朋友/猎头/投资人交流笔记：人才密度、审美判断、能动性、AI 杠杆

## 📋 自动索引（按最近更新排序）

```dataview
TABLE WITHOUT ID
  file.link AS "笔记",
  file.folder AS "目录",
  file.mtime AS "最近更新"
FROM "我的笔记" AND -"我的笔记/INDEX"
SORT file.mtime DESC
```

## 🚧 待补充清单

```dataview
LIST
FROM "我的笔记"
WHERE status = "todo"
```
