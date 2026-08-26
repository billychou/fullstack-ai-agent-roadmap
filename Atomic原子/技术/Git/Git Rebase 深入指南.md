

> **一句话总结**：`git rebase` 将当前分支的提交"重新播放"到目标分支之上，重写提交历史，使其变为线性结构。它是整理提交历史、保持项目线性的核心工具，但也是一把双刃剑——用对了事半功倍，用错了灾难性的。

---

## 核心概念

### 本质理解

Rebase 的英文原意是"改变基底"。它的本质是：

1. 找到当前分支与目标分支的**共同祖先**（分叉点）
2. 把当前分支上每个提交的**改动（diff）**提取出来暂存
3. 将当前分支的指针**直接移到目标分支的最新提交**上
4. 把暂存的改动**逐个重新应用**到新基线之上
5. 每次重新应用都会生成一个**全新的提交**（哈希值不同）

### 图解

```
# Rebase 之前
A---B---C (main)
     \
      D---E---F (feature)

# Rebase 之后（git rebase main）
A---B---C (main)
         \
          D'---E'---F' (feature)
```

D、E、F 的代码改动被完整保留，但生成了全新的提交 D'、E'、F'，哈希值全部改变。

### 与 Merge 的本质区别

|对比维度|Merge|Rebase|
|---|---|---|
|历史形态|分叉 + 汇合，产生合并提交|一条直线，无合并提交|
|底层操作|创建新的合并提交，保留原始历史|重写提交历史，生成全新提交|
|提交哈希|原始提交不变|所有 rebase 的提交哈希改变|
|安全性|对公共分支安全|对公共分支**极其危险**|
|适用场景|合并公共分支、保留完整历史|整理私有分支、保持历史线性|
|冲突处理|一次性解决所有冲突|逐个提交解决冲突|

> "Merge 是诚实的历史记录者，Rebase 是优雅的叙事诗人。"

---

## 基本用法

### 将当前分支 rebase 到目标分支

```bash
# 切换到功能分支
git checkout feature

# 将 feature 分支的提交重新应用到 main 分支最新位置之上
git rebase main
```

等效写法（不切换分支）：

```bash
git rebase main feature
```

### 同步远程最新代码

```bash
git fetch origin
git rebase origin/main
```

这比 `git pull`（本质是 fetch + merge）更干净，不会产生多余的合并提交。

---

## 交互式 Rebase（核心能力）

交互式 rebase 是 git rebase 最强大的功能，允许你对提交历史进行精细化的编辑、合并、重排和删除。

### 启动方式

```bash
# 回退 N 个提交，进入交互模式
git rebase -i HEAD~N

# 或者指定某个 commit 之后开始
git rebase -i <commit-hash>
```

### 编辑器界面

执行后会打开编辑器，显示类似内容（注意：**顺序与 `git log` 相反**，最早的在顶部）：

```
pick a1b2c3d 第一个提交描述
pick e4f5g6h 第二个提交描述
pick i7j8k9l 第三个提交描述
```

### 指令详解

|指令|简写|作用|
|---|---|---|
|`pick`|`p`|保留该提交，不做任何修改|
|`reword`|`r`|保留该提交，但**修改描述信息**|
|`edit`|`e`|暂停 rebase，可修改代码和描述，用 `git commit --amend` 修改后 `git rebase --continue`|
|`squash`|`s`|合并到**前一个**提交，保留所有描述供编辑|
|`fixup`|`f`|合并到**前一个**提交，**丢弃**当前提交的描述|
|`drop`|`d`|删除该提交|
|`break`|`b`|在此处暂停 rebase|

### 实战场景

#### 场景一：修改某个历史 commit 的描述

```bash
# 查看提交历史
git log --oneline
# a1b2c3d 最新的 commit
# e4f5g6h 要修改的 commit（上上次）
# i7j8k9l 更早的 commit

# 启动交互式 rebase（回退 2 个）
git rebase -i HEAD~2
```

编辑器中：

```
r e4f5g6h 要修改的 commit（上上次）
pick a1b2c3d 最新的 commit
```

保存退出后，Git 自动打开编辑器让你修改描述。

#### 场景二：合并多个零散提交（Squash）

开发过程中产生了 5 个零散提交，想合并为 1 个：

```bash
git rebase -i HEAD~5
```

编辑器中：

```
pick a1b2c3d 实现登录功能
squash b2c3d4e 修复 typo
squash c3d4e5f 又修 typo
squash d4e5f6g 添加测试
squash e5f6g7h 最终修复
```

保存后 Git 会打开编辑器，将 5 个描述合并在一起供你编辑为新描述。

#### 场景三：调整提交顺序

直接在编辑器中**上下移动行**即可改变提交顺序：

```
pick e4f5g6h 先执行这个
pick a1b2c3d 再执行这个
pick i7j8k9l 最后执行这个
```

#### 场景四：删除不需要的提交

将对应行的 `pick` 改为 `drop`，或直接删除该行：

```
pick a1b2c3d 保留这个
drop b2c3d4e 删除这个
pick c3d4e5f 保留这个
```

#### 场景五：拆分一个提交为多个

```bash
# 标记要拆分的提交为 edit
git rebase -i HEAD~3
# 将目标行改为：edit a1b2c3d 一个很大的提交
```

暂停后执行：

```bash
git reset HEAD~1          # 撤销该提交，但保留改动
git add file1.js          # 暂存第一部分
git commit -m "第一部分"
git add file2.js          # 暂存第二部分
git commit -m "第二部分"
git rebase --continue     # 继续 rebase
```

---

## 高级用法

### `--onto`： transplant 提交到任意基线

将某个分支的一部分提交"移植"到另一个分支上：

```bash
# 将 topic 分支中 next..topic 的提交移植到 master 上
git rebase --onto master next topic
```

图示：

```
# 之前
o---o---o---o---o (master)
             \
              o---o---o---o---o (next)
                               \
                                o---o---o (topic)

# 之后
o---o---o---o---o (master)
                 \
                  o'--o'--o' (topic)
```

### `--exec`：每个提交后自动执行命令

常用于在每个提交后跑测试，确保中间状态也是可编译的：

```bash
git rebase -i HEAD~5 --exec "npm test"
```

### `--autosquash`：自动合并 fixup 提交

配合 `git commit --fixup=<hash>` 使用，自动将修复提交合并到目标提交：

```bash
# 创建一个修复提交
git commit --fixup=a1b2c3d -m "fixup! 原始提交描述"

# 自动合并
git rebase -i --autosquash HEAD~3
```

### `--autostash`：未提交的改动也能 rebase

自动创建临时 stash，rebase 完成后自动恢复：

```bash
git rebase --autostash main
```

### `--rebase-merges`：保留分支结构

默认 rebase 会丢弃 merge commit，加此参数可保留分支拓扑结构：

```bash
git rebase -i --rebase-merges main
```

---

## 冲突处理

Rebase 过程中遇到冲突时：

```bash
# 1. 查看冲突文件
git status

# 2. 手动编辑解决冲突

# 3. 标记冲突已解决
git add <冲突文件>

# 4. 继续 rebase
git rebase --continue
```

其他控制命令：

```bash
git rebase --skip      # 跳过当前提交
git rebase --abort     # 放弃整个 rebase，回到操作前状态
git rebase --edit-todo # 重新编辑待办列表
```

> 💡 与 merge 不同，rebase 是**逐个提交**解决冲突的，同一个文件可能在多个提交中反复冲突。

---

## 铁律与安全边界

### 绝对禁止

> **永远不要对已经推送到公共远程仓库、且有其他协作者基于其开发的提交执行 rebase。**

这是 Git 官方文档中明确标注的最高优先级警告，没有任何例外。

原因：rebase 会重写提交哈希，远程仓库的提交发生变化后，其他协作者 pull 时 Git 会把两个不同的历史合并，生成大量重复提交，导致历史彻底混乱。

### 安全使用场景

- ✅ 本地私有分支的提交整理
- ✅ 同步主干最新代码到个人功能分支
- ✅ 提交 PR/MR 之前的历史清理
- ✅ 未推送到远程的提交修改

### 禁止使用场景

- ❌ 公共分支（main / develop / release）
- ❌ 已推送且有他人基于其开发的分支
- ❌ 已合并到公共主干的提交

---

## 最佳实践工作流

### 推荐的混合工作流

> "本地开发用 rebase，集成发布用 merge"

```bash
# 1. 在功能分支开发
git checkout -b feature/login
# ... 编码、提交 ...

# 2. 提交 PR 前，同步主干并整理历史
git fetch origin
git rebase origin/main
git rebase -i HEAD~N    # 整理提交，squash 零散提交

# 3. 推送到远程
git push origin feature/login

# 4. 合并到主干时，使用 merge（保留集成记录）
git checkout main
git merge --no-ff feature/login
```

### 强制推送的安全替代

如果需要推送 rebase 后的分支，用 `--force-with-lease` 代替 `--force`：

```bash
# 安全方式：会检查远程是否有他人新提交，避免覆盖
git push --force-with-lease

# 危险方式：无条件覆盖远程
git push --force
```

---

## 误操作恢复

如果 rebase 出了问题，可以通过 `git reflog` 找回原始状态：

```bash
# 1. 查看操作历史
git reflog

# 2. 找到 rebase 前的 commit 哈希
# 例如：abc1234 HEAD@{5}: rebase (start): checkout main

# 3. 回退到 rebase 前的状态
git reset --hard abc1234
```

> 💡 建议在执行 rebase 前创建备份分支：`git branch backup-before-rebase`

---

## 常见误区

|误区|纠正|
|---|---|
|Rebase 会丢失代码|Rebase 不会丢失任何代码改动，只是重写了提交哈希|
|Rebase 比 Merge 更高级|两者是互补工具，没有优劣之分，只是适用场景不同|
|Fast-Forward 和 Rebase 结果一样|FF 只移动指针不修改提交；Rebase 生成全新提交|
|Rebase 后 force push 就行|对公共分支 rebase 后即使 force push 也会破坏协作者历史|
|不确定时就用 Rebase|不确定时**默认用 Merge**，更安全|

---

## 速查表

```bash
# 基础 rebase
git rebase <target-branch>

# 交互式 rebase（修改历史）
git rebase -i HEAD~N

# 继续 / 跳过 / 放弃
git rebase --continue
git rebase --skip
git rebase --abort

# 移植到任意基线
git rebase --onto <newbase> <upstream> <branch>

# 每个提交后执行命令
git rebase -i --exec "make test"

# 自动合并 fixup 提交
git rebase -i --autosquash

# 保留 merge commit 结构
git rebase -i --rebase-merges

# 安全强制推送
git push --force-with-lease

# 误操作恢复
git reflog
git reset --hard <commit-hash>
```

---

_标签：#git #rebase #版本控制 #交互式rebase #提交历史管理 #merge对比_

---

需要我再整理一份 git cherry-pick 的原子笔记吗？它和 rebase 经常配合使用，用来单独提取某个提交到当前分支。