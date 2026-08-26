
Git 的核心设计理念是将文件管理划分为**四个独立区域**，每个区域承担不同职责，文件在这些区域之间单向流转，形成一条完整的版本控制链路。

---

## 四大区域

```
工作区（Working Directory）
    │
    │  git add
    ▼
暂存区（Staging Area / Index）
    │
    │  git commit
    ▼
本地仓库（Local Repository）
    │
    │  git push
    ▼
远程仓库（Remote Repository）
```

---

### 工作区（Working Directory）

工作区就是你在电脑上看到的**项目文件夹**，是你能直接打开、编辑、删除文件的地方。

- 它是你日常写代码的"工作台"
- 里面的文件可能是未跟踪的、已修改的、或未暂存的
- Git 不直接管理工作区中的文件，它只关心你"准备提交什么"

**常见操作：**

```bash
# 查看工作区中哪些文件被修改了
git status

# 查看工作区文件与最近一次提交之间的具体差异
git diff
```

### 暂存区（Staging Area / Index）

暂存区是一个**临时文件**（位于 `.git/index`），用来记录你"下一次 commit 要包含哪些内容"。

它是工作区和仓库之间的**缓冲区**，让你可以精心挑选要提交的内容，而不是把工作区的所有改动一股脑提交。

**常见操作：**

```bash
# 将文件从工作区放入暂存区
git add <file>

# 查看暂存区与最近一次提交之间的差异
git diff --cached

# 将文件从暂存区撤回工作区（取消暂存）
git reset HEAD <file>
```

### 本地仓库（Local Repository）

本地仓库位于项目根目录下的 `.git` 文件夹中，存储了完整的提交历史、分支、标签等所有版本信息。

- 每次 `git commit` 都会在本地仓库中生成一个新的提交对象
- 本地仓库是**完整的**，即使断网也能查看历史、切换分支
- 它是 Git 分布式特性的核心——每个人本地都有一份完整仓库

**常见操作：**

```bash
# 查看提交历史
git log

# 查看某个提交的详细内容
git show <commit-hash>
```

### 远程仓库（Remote Repository）

远程仓库是托管在服务器上的仓库（如 GitHub、GitLab），用于团队协作和代码备份。

**常见操作：**

```bash
# 推送本地提交到远程
git push

# 拉取远程最新代码
git pull          # 本质是 fetch + merge
git fetch         # 只拉取，不合并
```

---

## 文件的生命周期

一个文件从创建到被追踪，会经历以下状态流转：

```
未跟踪（Untracked）
    │  git add
    ▼
已暂存（Staged）──── git commit ────▶ 已提交（Committed）
    ▲                                      │
    │  git reset HEAD                       │  修改文件
    │                                      ▼
已修改（Modified）  ◀────────────────  已跟踪（Tracked）
```

|状态|含义|所在区域|
|---|---|---|
|Untracked|Git 不知道这个文件的存在|工作区|
|Modified|文件已修改但还没放入暂存区|工作区|
|Staged|已放入暂存区，等待提交|暂存区|
|Committed|已安全存入本地仓库|本地仓库|

---

## 为什么要分这么多区域？

核心目的是**解耦**，让每一步都可控：

- **工作区 → 暂存区**（`git add`）：让你精确选择哪些改动要提交，可以分多次 add 不同的文件，把不相关的改动拆成不同的提交
- **暂存区 → 本地仓库**（`git commit`）：确认无误后再正式记录，相当于"签字画押"
- **本地仓库 → 远程仓库**（`git push`）：确认本地历史整理好后再同步给团队

这种设计让你拥有**三次反悔机会**：

|阶段|反悔方式|
|---|---|
|工作区改错了|直接修改文件，或 `git checkout -- <file>` 丢弃改动|
|暂存区放错了|`git reset HEAD <file>` 取消暂存|
|提交写错了|`git commit --amend` 或 `git reset --soft HEAD~1` 撤销提交|

---

## 一个实际例子

```bash
# 1. 修改了三个文件（工作区）
vim login.js utils.js README.md

# 2. 查看状态，三个文件都是 Modified
git status

# 3. 只想提交 login.js 和 utils.js（放入暂存区）
git add login.js utils.js

# 4. 再看一下，README.md 还在工作区未暂存
git status

# 5. 确认暂存区内容无误，提交到本地仓库
git commit -m "feat: 完善登录逻辑和工具函数"

# 6. 推送到远程仓库
git push origin feature/login
```

---

## 速查对照表

|命令|数据流向|作用|
|---|---|---|
|`git add`|工作区 → 暂存区|暂存改动|
|`git commit`|暂存区 → 本地仓库|创建提交|
|`git push`|本地仓库 → 远程仓库|推送提交|
|`git fetch`|远程仓库 → 本地仓库|拉取远程更新|
|`git pull`|远程仓库 → 本地仓库 + 工作区|拉取并合并|
|`git checkout`|本地仓库 → 工作区|切换分支/恢复文件|
|`git reset HEAD`|暂存区 → 工作区|取消暂存|
|`git diff`|比较工作区与暂存区|查看未暂存的改动|
|`git diff --cached`|比较暂存区与本地仓库|查看已暂存的改动|

---

_标签：#git #工作区 #暂存区 #版本控制 #基础概念_

---

需要我继续整理 `git add` 的高级用法（如交互式暂存 `git add -p`）或者 `git stash` 的原子笔记吗？