---
tags:
  - AI
  - LangChain
  - RAG
  - 向量数据库
---

# 04 - RAG 检索增强生成

> 前置：[[02-模型与消息]]。RAG = Retrieval-Augmented Generation，让 LLM 基于"你的私有知识"回答，是 2026 年最主流的企业级 LLM 应用形态。

## 一、为什么需要 RAG

| 方案 | 原理 | 缺点 |
|---|---|---|
| 直接问模型 | 靠训练数据 | 不知道你的私有知识；会编造（幻觉） |
| 微调 | 改模型权重 | 贵、慢、知识更新难 |
| **RAG（推荐）** | **先检索相关文档，再让模型基于文档回答** | 检索质量决定上限 |

**核心价值**：知识更新零成本（换文档即可）、可溯源（引用来源）、无需训练。

## 二、RAG 完整链路（五步）

```
文档库 ──1加载──> 2切分 ──3向量化──> 4存储(向量库) ──5检索──> 生成回答
                                                          │
                                             相关片段 + 用户问题 ──> LLM
```

**五个环节：**

### 1️⃣ Document Loaders：加载文档

```python
from langchain_community.document_loaders import PyPDFLoader, TextLoader

loader = PyPDFLoader("公司制度手册.pdf")
docs = loader.load()   # 每页一个 Document

# 其他：WebBaseLoader（网页）、DirectoryLoader（目录批量）、CSVLoader ...
# Document 对象：page_content（文本）+ metadata（来源、页码等）
```

### 2️⃣ Text Splitters：切分文档

LLM 上下文有限，且相关性检索需要"小块"，所以必须切分：

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,        # 每块 500 字符
    chunk_overlap=50,      # 块间重叠 50 字符（保持上下文连贯）
)
chunks = splitter.split_documents(docs)
```

**切分策略选择：**
- `RecursiveCharacterTextSplitter`：通用默认，按段落/句子递归切
- 按语义切分（如标题结构）：Markdown/HTML 专用 splitter
- 代码按 token 切分：`TokenTextSplitter`
- 中文注意：默认按英文标点切，中文可自定义 separators

### 3️⃣ Embeddings：向量化

把文本变成高维向量（语义相近 → 向量相近）：

```python
from langchain_openai import OpenAIEmbeddings
from langchain_ollama import OllamaEmbeddings

# 云端
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
# 或本地（免费、数据不出域）
# embeddings = OllamaEmbeddings(model="nomic-embed-text")

vec = embeddings.embed_query("RAG 是什么")  # 返回 1536 维向量
```

### 4️⃣ Vector Store：存储与检索

```python
from langchain_chroma import Chroma
# 其他：FAISS（本地文件）、pgvector（PostgreSQL）、Pinecone/Qdrant（云托管）

vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./chroma_db",   # 持久化到磁盘
)
```

### 5️⃣ Retriever：检索相关片段

```python
retriever = vectorstore.as_retriever(
    search_type="similarity",      # 相似度检索（默认）
    search_kwargs={"k": 4},        # 返回最相关的 4 块
)

docs = retriever.invoke("公司年假政策是什么")
for d in docs:
    print(d.page_content, d.metadata)   # 片段 + 来源（用于引用溯源）
```

## 三、组装完整 RAG（生成环节）

```python
from langchain_core.prompts import ChatPromptTemplate

# 1. 检索
question = "公司年假怎么休？"
contexts = retriever.invoke(question)
context_text = "\n\n".join(d.page_content for d in contexts)

# 2. 构造带上下文的提示词
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是公司制度问答助手。只依据提供的资料回答，资料没有的明确说'资料中未提及'，禁止编造。回答时标注来源。"),
    ("human", "资料：\n{context}\n\n问题：{question}"),
])

# 3. 生成
resp = llm.invoke(prompt.invoke({"context": context_text, "question": question}))
print(resp.content)
```

## 四、RAG 进阶技巧（提升效果的关键）

### 检索质量优化
| 技术 | 做法 | 效果 |
|---|---|---|
| **MMR 检索** | `search_type="mmr"` 兼顾相关性与多样性 | 避免返回内容雷同的片段 |
| **多查询检索** | 把一个问题改写成多个子问题分别检索 | 提高召回率 |
| **上下文压缩** | 检索后用 LLM 压缩无关内容 | 省 token、去噪音 |
| **Rerank（重排序）** | 粗检索 Top50 → 重排序模型精排 Top5 | 效果提升最明显 |
| **Hybrid Search** | 向量 + 关键词（BM25）融合 | 专有名词/代码场景更准 |

### 引用溯源（生产必备）
```python
# 把 metadata 中的来源拼进答案
answer = f"{resp.content}\n\n**来源**：{', '.join({d.metadata.get('source','') for d in contexts})}"
```

## 五、RAG 失败模式排查清单

| 症状 | 可能原因 | 对策 |
|---|---|---|
| 答非所问 | 检索到无关片段 | 换更好的 embedding；加 Rerank |
| 答案太散 | 切分太碎 | 调大 chunk_size |
| 编造答案 | 资料里根本没有 | 加强 prompt 约束 + 强制"未提及就说明" |
| 专有名词检索不到 | 向量检索对精确词不友好 | Hybrid Search（+BM25） |
| 上下文爆炸 | 返回片段太多 | 减小 k、加压缩 |

## 六、本节小结

```
加载(Loaders) → 切分(Splitters) → 向量化(Embeddings)
    → 存储(Vector Store) → 检索(Retriever) → 生成(LLM + Prompt)
```

**RAG 的质量瓶颈在"检索"而不在"生成"** —— 检索到的东西不好，模型再强也白搭。

## 七、动手任务

1. 找一份自己的文档（PDF/Markdown），跑通完整五步 RAG。
2. 对比 chunk_size = 200 / 500 / 1000 的效果差异。
3. 在检索环节打印检索到的片段，人工判断检索质量。
4. （进阶）实现 Hybrid Search：向量检索 + 关键词检索，用 RRF 算法融合排序。
5. （进阶）把 RAG 封装成 `create_agent` 的一个工具，让 Agent 自主决定何时查资料。
