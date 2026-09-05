# psycopg3（Psycopg 3）— Python PostgreSQL 驱动使用手册

**适用版本：psycopg 3.3.x（最新 3.3.5，2026-09 发布）／ Python ≥ 3.10（支持至 3.14）／ PostgreSQL 12+**

> psycopg 是 Python 连接 PostgreSQL 的事实标准驱动。Psycopg 3 是对 psycopg2 的完全重写：保持 DB-API 2.0 兼容，同时带来原生 asyncio、服务端参数绑定、pipeline 模式、重新设计的连接池等现代特性。
> 注意：**包名和导入名都是 `psycopg`，不是 `psycopg3`**。

---

## 1. 安装

```bash
pip install --upgrade pip
pip install "psycopg[binary,pool]"   # 推荐：驱动 + 预编译二进制 + 连接池
```

三种发行形态（对应 psycopg2 时代的不同包）：

| 安装方式 | 说明 | 对应 psycopg2 时代 |
|----------|------|--------------------|
| `psycopg[binary]` | 预编译的 libpq 绑定，无需本机编译环境，适合大多数场景 | `psycopg2-binary` |
| `psycopg[c]` | 自行编译 C 扩展，适合有构建环境、追求定制的场景 | `psycopg2` |
| `psycopg`（纯 Python） | 不带加速扩展的接口包，库（library）依赖应只声明它 | — |

连接池是独立包 `psycopg_pool`，用 `[pool]` extra 一并安装。

---

## 2. 基本用法（同步）

```python
# 注意：模块名是 psycopg，不是 psycopg3
import psycopg

# 连接数据库
with psycopg.connect("dbname=test user=postgres") as conn:

    # 打开游标执行操作
    with conn.cursor() as cur:

        # 建表
        cur.execute("""
            CREATE TABLE test (
                id serial PRIMARY KEY,
                num integer,
                data text)
            """)

        # 参数化插入（防 SQL 注入，Psycopg 负责类型转换）
        cur.execute(
            "INSERT INTO test (num, data) VALUES (%s, %s)",
            (100, "abc'def"))

        # 查询
        cur.execute("SELECT * FROM test")
        print(cur.fetchone())          # (1, 100, "abc'def")

        # 批量执行
        cur.executemany(
            "INSERT INTO test (num) VALUES (%s)",
            [(33,), (66,), (99,)])

        # fetchmany / fetchall / 直接迭代游标
        cur.execute("SELECT id, num FROM test ORDER BY num")
        for record in cur:
            print(record)

        # 提交事务
        conn.commit()
```

连接串支持关键字形式（`dbname=... user=...`）和 URL 形式（`postgresql://user:pass@host:5432/dbname`）。

---

## 3. Psycopg 3 的快捷写法

相比 psycopg2，Psycopg 3 提供了更精简的写法：

```python
# 1) Connection 直接带 execute()，省掉显式建游标
cur = conn.execute(...)          # 等价于 cur = conn.cursor(); cur.execute(...)

# 2) execute() 返回游标自身，可以链式取结果
record = cur.execute(...).fetchone()
for record in cur.execute(...):
    ...

# 3) 简单场景一行搞定
print(psycopg.connect(DSN).execute("SELECT now()").fetchone()[0])
```

**3.3 新增**：游标从"可迭代对象"升级为"迭代器"，可以用 `next()` 取第一行——对"必然返回一行"的查询（如 `SELECT count(*)`），`next(cur)` 不会返回 `None`，类型检查器（mypy）不再抱怨：

```python
cur.execute("SELECT count(*) FROM my_table")
count = next(cur)[0]    # 替代 cur.fetchone()[0]，无 Optional 告警
```

---

## 4. 事务管理

### 4.1 `with` 连接块（注意与 psycopg2 的差异！）

```python
with psycopg.connect() as conn:
    ...    # 正常退出 → 自动 COMMIT；抛异常 → 自动 ROLLBACK；两种情况都会关闭连接
```

**关键差异**：psycopg2 的 `with connection` 只结束事务、不关连接；Psycopg 3 的 `with` 退出时会**关闭连接**，行为与文件等资源一致。

### 4.2 显式事务块 `transaction()`

psycopg2 时代"一个连接管多个事务"的模式，在 Psycopg 3 里用更显式的 `transaction()`：

```python
with psycopg.connect() as conn:
    with conn.transaction():          # 块内自动 commit / rollback
        conn.execute("INSERT INTO ...")
        with conn.transaction():      # 嵌套 → SAVEPOINT
            conn.execute("INSERT INTO ...")
```

### 4.3 autocommit

```python
conn = psycopg.connect(DSN, autocommit=True)
# 或动态切换
conn.autocommit = True
```

需要"事务外执行"的语句（如 `CREATE DATABASE`）必须在 autocommit 下、且不能与其他语句拼批执行。

---

## 5. 异步用法（asyncio）

Psycopg 3 原生支持 `async/await`，API 与同步版一一对应（类名加 `Async` 前缀，方法前加 `await`）：

```python
import asyncio
import psycopg

async def main():
    async with await psycopg.AsyncConnection.connect("dbname=test user=postgres") as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT %s", ["hello"])
            print(await cur.fetchone())

asyncio.run(main())
```

注意 `async with await psycopg.AsyncConnection.connect(...)` 里 **`await` 不能省**——`connect()` 是返回协程的类方法。

异步游标同样支持 `async for record in cur`、`executemany`、`copy` 等，FastAPI / asyncio 服务推荐直接用异步连接或异步连接池。

---

## 6. 连接池（psycopg_pool）

连接池独立于主包，提供 `ConnectionPool`（同步）与 `AsyncConnectionPool`（异步）：

```python
from psycopg_pool import ConnectionPool

pool = ConnectionPool(
    conninfo="dbname=test user=postgres",
    min_size=2,
    max_size=10,
)

with pool.connection() as conn:      # 从池中借连接，用完自动归还
    conn.execute("SELECT now()")
```

FastAPI 中的典型用法（lifespan 里开关池 + 依赖注入）：

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from psycopg_pool import ConnectionPool

pool = ConnectionPool("dbname=app user=app", min_size=2, max_size=20)

@asynccontextmanager
async def lifespan(app: FastAPI):
    pool.open()
    pool.wait()          # 等待池准备好
    yield
    pool.close()

app = FastAPI(lifespan=lifespan)

@app.get("/users/{user_id}")
def get_user(user_id: int):
    with pool.connection() as conn:
        return conn.execute(
            "SELECT id, name FROM users WHERE id = %s", [user_id]
        ).fetchone()
```

**3.3 的连接池增强**：
- 池参数可在运行时**动态修改**——适合某些云数据库要求的短期密钥轮换（把新密码/令牌更新进池配置）；
- 新增 `drain()` 方法：重建池中所有连接。典型场景是给连接注册完扩展类型的适配器后，清掉仍持有旧状态的存量连接。

---

## 7. 行工厂（row factory）：把行变成 dict / namedtuple

psycopg2 的游标子类在 Psycopg 3 里换成了"行工厂"：

| psycopg2 | Psycopg 3 |
|----------|-----------|
| `RealDictCursor` | `dict_row` |
| `NamedTupleCursor` | `namedtuple_row` |
| `DictCursor` | 无直接等价物 |

```python
from psycopg.rows import dict_row, namedtuple_row

# 连接级：所有游标默认返回 dict
conn = psycopg.connect(DSN, row_factory=dict_row)
row = conn.execute("SELECT id, name FROM users").fetchone()
print(row["name"])

# 也可以只对单个游标生效
cur = conn.cursor(row_factory=namedtuple_row)
```

还有 `class_row`（映射到自定义类）等，见官方 `psycopg.rows` 文档。

> 提示：LangGraph 的 PostgresSaver 等组件要求连接带 `autocommit=True` 和 `row_factory=dict_row`，就是用上面这两个参数。

---

## 8. 参数化查询：服务端绑定与常见坑

Psycopg 3 默认使用**服务端绑定**：SQL 和参数分开发送给服务器（占位符在服务端变成 `$1, $2…`），比 psycopg2 的客户端拼接更安全，也支持 prepared statement 自动复用。但这带来几个与 psycopg2 不同的限制：

### 8.1 这些语句不能用 `%s` 参数

`SET`、`NOTIFY`、DDL 等语句不支持服务端绑定：

```python
# ❌ 报错：syntax error at or near "$1"
conn.execute("SET TimeZone TO %s", ["UTC"])
conn.execute("CREATE TABLE foo (id int DEFAULT %s)", [42])

# ✅ 改用 PG 函数形式
conn.execute("SELECT set_config('TimeZone', %s, false)", ["UTC"])
conn.execute("SELECT pg_notify(%s, %s)", ["chan", "42"])
```

实在无法绕开时，用**客户端绑定游标** `ClientCursor`（行为接近 psycopg2）：

```python
from psycopg import ClientCursor

cur = ClientCursor(conn)
cur.execute("CREATE TABLE foo (id int DEFAULT %s)", [42])
```

### 8.2 占位符只能填"值"，表名/列名要用 `psycopg.sql`

```python
from psycopg import sql

conn.execute(
    sql.SQL("ALTER USER {} SET PASSWORD {}")
    .format(sql.Identifier(username), password))
```

### 8.3 `IN %s` 元组写法不行了 → 用 `= ANY(%s)`

```python
# ❌ psycopg2 可以，Psycopg 3 报错
conn.execute("SELECT * FROM foo WHERE id IN %s", [(10, 20, 30)])

# ✅ 传 list，自动适配为 PG 数组；还支持空列表
conn.execute("SELECT * FROM foo WHERE id = ANY(%s)", [[10, 20, 30]])
```

### 8.4 `IS %s` 不行了 → 用 `IS [NOT] DISTINCT FROM`

```python
conn.execute("SELECT * FROM foo WHERE field IS NOT DISTINCT FROM %s", [None])
```

### 8.5 带参数时不能一次执行多条语句

```python
# ❌ cannot insert multiple commands into a prepared statement
conn.execute("INSERT INTO foo VALUES (%s); INSERT INTO foo VALUES (%s)", (10, 20))
```

拆成多次 `execute()`；或用 `psycopg.sql` 在客户端拼好（无参数时无此限制）。

多语句返回多个结果集时，psycopg2 只给最后一个结果，Psycopg 3 全部保留：

```python
cur.execute("SELECT 1; SELECT 2")
for _ in cur.results():       # 3.3 之前用 nextset()
    print(cur.fetchone())
```

### 8.6 其他迁移注意点

- `cursor.callproc()` 被移除 → 直接 `execute("SELECT func(...)")` 或 `execute("CALL proc(...)")`；
- `client_encoding` 参数没了，自动按数据库编码解码为 Unicode；
- PG 的 `infinity` 日期不再默认映射成 `date.max`，超出 Python 范围（年份 > 9999）会抛溢出，需要时自定义 loader；
- 某些不支持扩展查询协议的场景（如 PgBouncer 管理控制台）要用 `ClientCursor`；
- 罕见情况下服务端推不出参数类型（如可变参数函数），显式加 cast：`%s::text`。

---

## 9. COPY：不再是文件式接口

Psycopg 3 用统一的 `copy()` 方法，支持按块/按行读写，也支持异步：

```python
# 写入
with conn.cursor() as cur:
    with cur.copy("COPY test (num, data) FROM STDIN") as copy:
        for row in rows:
            copy.write_row(row)

# 读出
with cur.copy("COPY test TO STDOUT") as copy:
    for row in copy.rows():
        print(row)
```

---

## 10. Psycopg 3.3 新特性（2025-12 发布）

### 10.1 t-string 模板字符串查询（需 Python 3.14）

借助 Python 3.14 的模板字符串（PEP 750），写出既像 f-string 又天然防注入的查询：

```python
def fetch_person(conn, name):
    # name 会被安全处理：作为服务端参数，或在需要客户端拼接时正确转义
    cur = conn.execute(t"SELECT * FROM people WHERE name = {name}")
    return cur.fetchone()
```

还能替代 `psycopg.sql` 模块做动态 SQL 组合，简洁得多：

```python
# 客户端拼接标识符 + 服务端绑定参数，混用
conn.execute(t"DELETE FROM {table_name:i} WHERE name = {name}")

# 完全客户端组合的非参数语句
conn.execute(t"NOTIFY {table_name + '.deleted':i}, {name:l}")
```

### 10.2 更灵活的复合类型（composite）适配

以前 PG composite 只能映射为字段一一对应的 Python 序列；现在可以自定义工厂，比如直接映射到 dataclass：

```python
from dataclasses import dataclass
from psycopg.types.composite import CompositeInfo, register_composite

@dataclass
class MiniPerson:
    age: int
    name: str
    height: float | None = None

    @classmethod
    def from_db(cls, seq, info):
        return cls(name=seq[0], age=seq[1])

    def to_db(self, info):
        return [self.name, self.age]

conn.execute("CREATE TYPE mini_person AS (name text, age int)")
info = CompositeInfo.fetch(conn, "mini_person")

register_composite(
    info, conn, factory=MiniPerson,
    make_object=MiniPerson.from_db, make_sequence=MiniPerson.to_db)

conn.execute("SELECT ('John', 33)::mini_person").fetchone()[0]
# MiniPerson(age=33, name='John', height=None)
```

### 10.3 其他改进

- 游标成为迭代器，`next(cur)` / `anext(acur)` 取行更顺（见第 3 节）；
- `fetchmany()` 之后、多结果集之间导航更灵活；查询执行后还能重配 loader；
- 连接池参数可动态修改、新增 `drain()`（见第 6 节）。

---

## 11. 从 psycopg2 迁移速查表

| 主题 | psycopg2 | Psycopg 3 |
|------|----------|-----------|
| 安装包 | `psycopg2-binary` | `psycopg[binary]` |
| 导入 | `import psycopg2` | `import psycopg` |
| `with conn` | 只管事务，不关连接 | 提交/回滚**并关闭连接** |
| 事务块 | 依赖连接状态 | 显式 `conn.transaction()`，支持嵌套（SAVEPOINT） |
| 参数绑定 | 客户端拼接 | 默认服务端绑定（`$1` 协议） |
| `IN %s` + 元组 | 支持 | 改用 `= ANY(%s)` + list |
| 游标变体 | `RealDictCursor` 等子类 | `row_factory=dict_row` 等 |
| COPY | `copy_expert` + 文件对象 | `cur.copy()` + `write_row`/`rows()` |
| `callproc()` | 有 | 移除，直接 `execute` |
| 异步 | 需第三方（aiopg 等） | 原生 `AsyncConnection` |
| 连接池 | 自带简单池 / 外部库 | 独立 `psycopg_pool`，生产级 |

其他值得知道的新能力：prepared statements 自动管理、二进制传输（`execute(..., binary=True)`）、pipeline 模式（`conn.pipeline()`）、完整静态类型标注、直接访问底层 libpq（`psycopg.pq`）。

---

## 12. 版本与参考

- 当前稳定版：**3.3.5**（2026-09-01）；3.3.0 发布于 2025-12-01
- 要求 **Python ≥ 3.10**，支持 CPython 3.10–3.14 与 PyPy
- 许可：LGPL-3.0

**参考资料**：
- 📖 [Psycopg 3 官方文档](https://www.psycopg.org/psycopg3/docs/)
- 📖 [基础用法](https://www.psycopg.org/psycopg3/docs/basic/usage.html)
- 📖 [从 psycopg2 迁移差异](https://www.psycopg.org/psycopg3/docs/basic/from_pg2.html)
- 📖 [连接池文档](https://www.psycopg.org/psycopg3/docs/advanced/pool.html)
- 📦 [PyPI: psycopg](https://pypi.org/project/psycopg/)
- 📰 [Psycopg 3.3 发布公告（postgresql.org）](https://www.postgresql.org/about/news/psycopg-33-released-3187/)

相关笔记：[[W01-SQL与PostgreSQL]] · [[W04-ORM与迁移]] · [[postgresql常用操作-与mysql对比]]
