
你可能会对某些关键的 `asyncio` 概念感到好奇。读完本文后，你将能够轻松地回答这些问题：
- 当一个对象被等待时，幕后发生了什么？
- `asyncio` 如何区分不需要 CPU 时间的任务（如网络请求或文件读取）和与之相反的任务（如计算 n 的阶乘）？
- 如何编写一个操作的异步变体，例如异步的休眠或数据库请求。

## 高层次

我们将介绍主要的、高层级的 `asyncio` 构成部分：事件循环、协程函数、协程对象、任务和 `await`。

### 事件循环
`asyncio` 中的一切都与事件循环相关。它是演出的主角。它就像一名乐队指挥一样在幕后管理资源。它掌握着一些权力，但它完成工作的能力很大程度上来自于它的工蜂们的尊重与合作。

用更专业的术语来说，事件循环包含一组待运行的作业。有些作业是由你直接添加的，有些则是由 `asyncio` 间接添加的。 事件循环会从其待处理事项中取出一个作业并唤起它（或称“给予其控制权”），类似于调用一个函数，然后该作业就会运行。 一旦它暂停或完成，它会将控制权返回给事件循环。然后事件循环会从作业池中选择另一个作业并唤起它。你可以 _粗略地_ 将这组作业视为一个队列：作业被添加然后被逐个处理，通常（但不总是）按顺序进行。此过程将无限地重复，事件循环也不停地循环下去。 如果没有待执行的作业，事件循环会足够智能地转入休息状态以避免浪费 CPU 周期，并在有更多工作需完成时恢复运行。

有效的执行依赖于作业的良好共享和合作；一个贪婪的作业可能会霸占控制权，让其他作业陷入饥饿，从而使整个事件循环机制变得毫无用处。
```
import asyncio

# 这会创建一个事件循环并无限循环地执行其作业集合。
event_loop = asyncio.new_event_loop()
event_loop.run_forever()
```

`asyncio` 的事件循环（Event Loop）底层本质上是一个基于**操作系统 I/O 多路复用机制**（I/O Multiplexing）的单线程循环。它通过不断监听文件描述符（FD）的状态变化和定时器事件，实现高效的非阻塞异步并发。

### 异步函数和协程

这是一个基本的、无趣的 Python 函数， 调用一个普通函数会执行它的逻辑或函数体。 
与普通的 `def` 不同，[async def](https://docs.python.org/zh-cn/3.14/reference/compound_stmts.html#async-def) 使它成为一个异步函数（或“协程函数”）。调用它会创建并返回一个 [协程](https://docs.python.org/zh-cn/3.14/library/asyncio-task.html#coroutine) 对象。

协程代表函数体或逻辑。协程必须显式启动；再次强调，仅仅创建协程并不能启动它。值得注意的是，协程可以在函数体的不同位置暂停和恢复。这种暂停和恢复能力使得异步行为成为可能！


### 任务

粗略地说，[任务](https://docs.python.org/zh-cn/3.14/library/asyncio-task.html#asyncio-task-obj) 是绑定到事件循环的协程（而非协程函数）。任务还维护一个回调函数列表，这些回调函数的重要性在稍后讨论 [`await`](https://docs.python.org/zh-cn/3.14/reference/expressions.html#await) 时会更加清晰。推荐使用 [`asyncio.create_task()`](https://docs.python.org/zh-cn/3.14/library/asyncio-task.html#asyncio.create_task "asyncio.create_task") 创建任务。
