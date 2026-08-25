---
tags:
  - Python
  - Redis
  - 数据库
---


Redis 列表是简单的字符串列表，按照插入顺序排序，可以从头部或尾部添加元素。

### 📋 获取列表数据

| 命令                      | 说明          | 示例                         |
| ----------------------- | ----------- | -------------------------- |
| `LRANGE key start stop` | 获取列表指定范围的元素 | `LRANGE mylist 0 -1`（获取全部） |
| `LLEN key`              | 获取列表长度      | `LLEN mylist`              |
| `LINDEX key index`      | 通过索引获取元素    | `LINDEX mylist 0`（获取第一个）   |
|                         |             |                            |

### ✍️ 添加元素

| 命令 | 说明 |
|------|------|
| `LPUSH key value` | 从左侧（头部）插入 |
| `RPUSH key value` | 从右侧（尾部）插入 |
| `LINSERT key BEFORE/AFTER pivot value` | 在指定元素前/后插入 |

### 🗑️ 移除元素

| 命令 | 说明 |
|------|------|
| `LPOP key` | 从左侧弹出元素 |
| `RPOP key` | 从右侧弹出元素 |
| `LREM key count value` | 移除指定值的元素 |
| `LTRIM key start stop` | 只保留指定范围的元素 |

### 🔄 阻塞操作

| 命令 | 说明 |
|------|------|
| `BLPOP key timeout` | 阻塞式左侧弹出 |
| `BRPOP key timeout` | 阻塞式右侧弹出 |
