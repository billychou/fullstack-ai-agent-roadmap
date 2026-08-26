

> **一句话总结**：`git worktree` 允许你从同一个仓库同时创建多个独立的工作目录，每个目录检出不同的分支，共享同一个 `.git` 仓库数据。它彻底解决了"切换分支需要 stash/commit → 切分支 → 干活 → 切回来 → pop"的痛点，让你像切换文件夹一样切换分支，无需打断当前工作。

## 核心概念

### 本质理解

Git worktree 的核心理念是**一个仓库，多个工作目录**。

传统方式下，一个仓库只有一个工作目录，同一时间只能检出一个分支。要切换分支就必须先处理当前未完成的改动。Worktree 打破了这个限制——它为同一个仓库创建多个"分身"，每个分身是一个独立的文件夹，检出不同的分支，拥有独立的工作文件和暂存区，但共享同一个 `.git` 仓库（对象、引用、配置）。

### 架构

```
仓库（.git）
├── 主工作树（main worktree）         ← git init / git clone 创建
│     ├── .git/                       ← 完整的 Git 仓库数据
│     ├── src/
│     └── ...
├── 链接工作树 1（linked worktree）   ← git worktree add 创建
│     ├── .git                        ← 文件（非目录），指向主仓库
│     ├── src/
│     └── ...
└── 链接工作树 2（linked worktree）
      ├── .git                        ← 文件，指向主仓库
      ├── src/
      └── ...
```

### 两个关键概念

- **主工作树（Main Worktree）**：通过 `git init` 或 `git clone` 创建的原始仓库目录，包含完整的 `.git` 目录，是所有链接工作树的"母体"
- **链接工作树（Linked Worktree）**：通过 `git worktree add` 创建的额外工作目录，不包含独立的 `.git` 目录，而是通过一个 `.git` **文件**链接到主仓库的 `.git` 目录

### 共享与隔离

|内容|共享/独立|
|---|---|
|Git 对象（提交、树、blob）|✅ 共享|
|分支、标签、引用|✅ 共享|
|仓库配置（`.git/config`）|✅ 共享|
|HEAD 指针|❌ 独立（每个工作树有自己的 HEAD）|
|暂存区（Index）|❌ 独立|
|工作文件|❌ 独立|
|未提交的修改|❌ 独立|

---

## 与传统方式的对比

### 传统方式：git stash + checkout

```bash
# 正在开发功能，突然要修 bug
git stash                    # 暂存当前改动
git checkout hotfix          # 切换到 hotfix 分支
# ... 修复 bug ...
git commit -m "fix: 紧急修复"
git checkout feature         # 切回功能分支
git stash pop                # 恢复之前的改动（可能冲突！）
```

**痛点**：

- 打断开发思路
- `stash pop` 可能产生冲突
- 编译型语言需要重新编译，耗时巨大
- 无法同时查看两个分支的代码

### 克隆多个仓库

```bash
git clone git@github.com:user/project.git project-hotfix
```

**痛点**：

- 每个仓库都是独立的 `.git`，占用大量磁盘空间
- 仓库之间无法直接互通，同步代码需要 push/pull
- 维护成本高

### Worktree 方式

```bash
git worktree add -b hotfix ../project-hotfix main
# 直接进入 ../project-hotfix 目录修复 bug
# 主目录的代码和未提交改动完全不受影响
```

**优势**：

- ✅ 无需 stash，无需打断当前工作
- ✅ 共享 `.git`，几乎不占额外磁盘空间
- ✅ 多个分支并行开发，互不干扰
- ✅ 用后即焚，修完直接删除工作树
- ✅ 未提交的改动天然隔离，不需要任何暂存操作

### 三者对比

|对比维度|stash + checkout|多仓库 clone|worktree|
|---|---|---|---|
|磁盘占用|无额外占用|完整副本，占用大|仅工作文件，占用极小|
|上下文切换|需要 stash/pop|不需要|不需要|
|分支互通|同一仓库，直接互通|需要 push/pull|同一仓库，直接互通|
|并行开发|❌ 不行|✅ 可以|✅ 可以|
|编译缓存|切换后需重新编译|各自独立编译|各自独立编译|
|操作复杂度|中|高|低|

---

## 基本用法

### 创建工作树

```bash
# 基于已有分支创建工作树
git worktree add ../project-hotfix hotfix-branch

# 创建新分支并建立工作树（-b 创建新分支）
git worktree add -b new-feature ../project-feature main

# 基于指定提交创建（分离 HEAD 模式，适合临时查看/测试）
git worktree add --detach ../debug-dir abc1234

# 简写形式：路径最后一段自动作为分支名
git worktree add ../hotfix    # 等同于 git worktree add -b hotfix ../hotfix
```

### 查看所有工作树

```bash
git worktree list
```

输出示例：

```
/home/user/project          abc1234 [main]
/home/user/project-hotfix   def5678 [hotfix-branch]
/home/user/project-feature  ghi9012 [new-feature]
```

### 删除工作树

```bash
# 推荐方式：命令删除（自动清理目录和 Git 记录）
git worktree remove ../project-hotfix

# 强制删除（有未提交改动时）
git worktree remove --force ../project-hotfix
```

### 清理残留记录

如果手动删除了工作树目录（而非用 `git worktree remove`），需要清理残留的 Git 记录：

```bash
git worktree prune
```

---

## 实战场景

### 场景一：紧急 Bug 修复（最经典场景）

你正在 feature 分支开发新功能，突然线上出了问题：

```bash
# 1. 当前在 feature 分支，有大量未提交的改动
cd ~/projects/myapp
git status   # 一堆 Modified 文件

# 2. 创建 hotfix 工作树（无需 stash！）
git worktree add -b hotfix-urgent ../myapp-hotfix release

# 3. 进入 hotfix 目录修复
cd ../myapp-hotfix
vim src/error.js
git add .
git commit -m "fix: 修复线上紧急 bug"
git push origin hotfix-urgent

# 4. 修复完毕，删除工作树
cd ~/projects/myapp
git worktree remove ../myapp-hotfix

# 5. 回到主目录，所有未提交的改动都还在，继续开发
```

### 场景二：并行功能开发

同时开发多个不相关的功能：

```bash
# 创建三个工作树
git worktree add ../project-auth feature/auth-overhaul
git worktree add ../project-ui   feature/ui-redesign
git worktree add ../project-docs feature/update-docs

# 现在你有四个独立的工作目录：
# ~/projects/myapp          → main 分支
# ~/projects/project-auth   → auth 功能
# ~/projects/project-ui     → UI 重设计
# ~/projects/project-docs   → 文档更新
# 各自独立，互不干扰
```

### 场景三：代码审查与版本对比

```bash
# 检出同事的 PR 分支到独立目录查看
git worktree add ../review-pr-123 origin/feature/pr-123

# 用 IDE 打开两个目录，左右对比代码
# 审查完毕后清理
git worktree remove ../review-pr-123
```

### 场景四：测试特定历史版本

```bash
# 检出某个 tag 或 commit 进行测试
git worktree add --detach ../test-v1.0 v1.0.0

# 在这个干净的环境中运行测试
cd ../test-v1.0
npm test
```

---

## 高级用法

### 锁定工作树

当工作树位于可移动存储（U 盘、网络驱动器）上时，防止被自动清理：

```bash
# 锁定（可附带原因）
git worktree lock --reason "在外部存储上" ../project-hotfix

# 解锁
git worktree unlock ../project-hotfix
```

### 移动工作树

```bash
git worktree move ../old-path ../new-path
```

### 自动追踪远程分支

```bash
# 如果远程有同名分支，自动基于远程分支创建
git worktree add --guess-remote ../feature-x
```

也可以通过配置全局开启：

```bash
git config --global worktree.guessRemote true
```

### 工作树级别的独立配置

默认所有工作树共享仓库配置。如果需要每个工作树有独立配置：

```bash
# 启用工作树级别配置
git config extensions.worktreeConfig true

# 在当前工作树中添加独立配置
git config --worktree core.sparseCheckout true
```

---

## 注意事项与常见坑

### 分支互斥规则

> **同一个分支不能同时被两个工作树检出。** 这是 Git 的硬性限制。

```bash
# 如果 main 分支已在主工作树中检出，以下命令会报错
git worktree add ../another-main main
# fatal: 'main' is already checked out at '/home/user/project'

# 解决方法：使用 --force 或检出到其他分支
git worktree add --detach ../review-main main   # 以 detached HEAD 方式检出
```

### 不要嵌套创建工作树

```bash
# ❌ 不推荐：在主仓库内部创建
git worktree add ./sub-worktree feature-branch

# ✅ 推荐：在主仓库同级或外部目录创建
git worktree add ../sibling-worktree feature-branch
```

嵌套创建会导致 IDE 误识别为多根项目，可能引发各种异常。

### 不要手动删除目录

```bash
# ❌ 错误做法：直接 rm 目录
rm -rf ../project-hotfix
# Git 记录残留，分支仍被标记为"已检出"

# ✅ 正确做法
git worktree remove ../project-hotfix

# 如果已经手动删了，补救：
git worktree prune
```

### 工作树文件是完整副本

虽然 `.git` 对象库是共享的（节省空间），但工作目录中的文件是**完整副本**。对于包含大量 `node_modules`、`venv`、构建产物的项目，每个工作树都需要独立安装依赖。

---

## 最佳实践

### 目录组织

```bash
# 推荐的目录结构
~/projects/
├── myapp/                  # 主工作树（main 分支）
├── myapp-hotfix-01/        # hotfix 工作树
├── myapp-feature-login/    # 功能开发工作树
└── myapp-review-pr-42/     # 代码审查工作树
```

命名规范：`项目名-用途`，清晰标识每个工作树的用途。

### 用后即焚

工作树是临时的，用完就删：

```bash
# 任务完成后及时清理
git worktree remove ../myapp-hotfix-01
git worktree prune   # 兜底清理
```

### 定期查看状态

```bash
git worktree list          # 查看当前所有工作树
git worktree list -v       # 详细信息（含锁定/可修剪状态）
```

---

## 速查表

```bash
# 创建（已有分支）
git worktree add <路径> <分支>

# 创建（新分支）
git worktree add -b <新分支> <路径> [起始分支]

# 创建（分离 HEAD，查看特定提交）
git worktree add --detach <路径> <提交哈希>

# 查看所有工作树
git worktree list

# 删除工作树
git worktree remove <路径>

# 强制删除（有未提交改动）
git worktree remove --force <路径>

# 移动工作树
git worktree move <旧路径> <新路径>

# 锁定/解锁
git worktree lock <路径>
git worktree unlock <路径>

# 清理残留记录
git worktree prune

# 修复损坏的链接
git worktree repair
```

---

_标签：#git #worktree #多分支并行开发 #版本控制 #工作流优化_

---

至此，你的 Git 系列原子笔记已经覆盖了：commit 描述修改、rebase 深入指南、工作区概念、worktree 多分支并行开发。需要我继续整理其他 Git 主题吗？比如 `git stash`、`git cherry-pick`、`git bisect` 等。