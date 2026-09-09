
> 什么是异步IO？
> 解决什么问题？
> 应用场景？
> 如何实现的？
> 和其他解决方案的对比？

## 什么是AsyncIO？

异步 I/O（Asynchronous Input/Output）是一种程序处理数据输入与输出（如网络传输、磁盘读写）的协作机制。

它的核心思想是：**当程序发起一个耗时的 I/O 操作时，无需原地等待（阻塞）数据返回，而是立即去处理其他任务；直到数据准备好或传输完成，系统再通知程序回来继续处理。**

具体详情可以参考操作系统篇章 [[python标准库-IO]]

## 解决什么问题？ 

计算机硬件的处理速度存在巨大的阶梯差异：
- **CPU 计算**：纳秒级（如 CPU 寄存器 / L1 缓存）
- **内存读写**：微秒级
- **网络/磁盘 I/O**：毫秒级（比 CPU 慢数十万倍）
在传统的单线程同步编程中，一旦发生网络请求或磁盘读写，CPU 绝大部分时间都在**干等 I/O 返回**。异步 I/O 可以让 CPU 在等待 I/O 的空档期去处理其他任务，从而大幅提升系统的**并发吞吐量**。

## 应用场景

- **极度适合（I/O 密集型）**：
    - Web 服务器、 API 网关（如 Nginx, FastAPI, Node.js）
    - 聊天/实时通讯软件（Websocket 链接）
    - 网络爬虫
- **不适合（CPU 密集型）**：
    - 图像/视频编解码、复杂数学计算、机器学习模型训练（这类任务会直接吃满 CPU，异步框架无法出让控制权，通常需要多进程或多线程处理）。

## 实现方案

###  高层次API

我们将介绍主要的、高层级的 `asyncio` 构成部分：**事件循环**、**协程函数**、**协程对象**、**任务和 `await`**。

#### 事件循环

![[Pasted image 20260909085735.png]]

这张图全面展示了 Python `AsyncIO` 事件循环的内部原理和工作流，完美结合了你之前的技术提问：

1. **左侧（任务排队）**：展示了 Task 和回调函数如何进入事件循环。
    
2. **右侧（I/O 多路复用）**：对应你对“异步 I/O”和“底层实现”的提问。可以看到这里使用了 **epoll/kqueue/IOCP** 等操作系统原生技术。
    
3. **循环中心（_ready 和 _scheduled）**：对应你对“底层实现”的提问，展示了就绪队列和基于 Min-Heap（最小堆）的定时器管理。
    
4. **下方（驱动协程）**：展示了当 Future 完成时，事件循环如何通过调用回调函数来执行 `coro.send(value)`，从而恢复挂起的协程。
    
5. **跨线程唤醒（Waker）**：展示了如何跨线程通知循环。
    

这张图可以作为一个完整的底层参考。
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

它的实现依赖于底层生成器函数

[[生成器]] 

####  异步函数和协程

这是一个基本的、无趣的 Python 函数， 调用一个普通函数会执行它的逻辑或函数体。 
与普通的 `def` 不同，[async def](https://docs.python.org/zh-cn/3.14/reference/compound_stmts.html#async-def) 使它成为一个异步函数（或“协程函数”）。调用它会创建并返回一个 [协程](https://docs.python.org/zh-cn/3.14/library/asyncio-task.html#coroutine) 对象。

协程代表函数体或逻辑。协程必须显式启动；再次强调，仅仅创建协程并不能启动它。值得注意的是，协程可以在函数体的不同位置暂停和恢复。这种暂停和恢复能力使得异步行为成为可能！


####  任务

粗略地说，[任务](https://docs.python.org/zh-cn/3.14/library/asyncio-task.html#asyncio-task-obj) 是绑定到事件循环的协程（而非协程函数）。任务还维护一个回调函数列表，这些回调函数的重要性在稍后讨论 [`await`](https://docs.python.org/zh-cn/3.14/reference/expressions.html#await) 时会更加清晰。推荐使用 [`asyncio.create_task()`](https://docs.python.org/zh-cn/3.14/library/asyncio-task.html#asyncio.create_task "asyncio.create_task") 创建任务。


### 核心细节与运作机制[](https://docs.python.org/zh-cn/3.14/howto/a-conceptual-overview-of-asyncio.html#a-conceptual-overview-part-2-the-nuts-and-bolts)

本部分详细介绍 `asyncio` 用于管理控制流的机制。这正是魔法发生的地方。读完本节后，您将了解 `await` 在幕后做了什么，以及如何创建您自己的异步运算符。

#### 协程的内部工作原理[](https://docs.python.org/zh-cn/3.14/howto/a-conceptual-overview-of-asyncio.html#the-inner-workings-of-coroutines "Link to this heading")

`asyncio` 利用四个组件来传递控制权。

[`coroutine.send(arg)`](https://docs.python.org/zh-cn/3.14/reference/expressions.html#generator.send "generator.send") 是用于启动或恢复协程的方法。 如果协程已暂停并正在被恢复，则参数 `arg` 将作为原先暂停它的 `yield` 语句的返回值被发送。 如果协程是首次被使用（而不是被恢复），则 `arg` 必须为 `None`。

```
class Rock:
    def __await__(self):
        value_sent_in = yield 7
        print(f"Rock.__await__ resuming with value: {value_sent_in}.")
        return value_sent_in

async def main():
    print("Beginning coroutine main().")
    rock = Rock()
    print("Awaiting rock...")
    value_from_rock = await rock
    print(f"Coroutine received value: {value_from_rock} from rock.")
    return 23

coroutine = main()
intermediate_result = coroutine.send(None)
print(f"Coroutine paused and returned intermediate value: {intermediate_result}.")

print(f"Resuming coroutine and sending in value: 42.")
try:
    coroutine.send(42)
except StopIteration as e:
    returned_value = e.value
print(f"Coroutine main() finished and provided value: {returned_value}.")
```

[yield](https://docs.python.org/zh-cn/3.14/reference/expressions.html#yieldexpr)像往常一样暂停执行并将控制权返回给调用者。在上面的例子中，第 3 行的 `yield` 被第 11 行的 `... = await rock` 调用。更宽泛地说，`await` 会调用给定对象的 [`__await__()`](https://docs.python.org/zh-cn/3.14/reference/datamodel.html#object.__await__ "object.__await__") 方法。`await` 还会做一件非常特别的事情：它会将接收到的任何 `yield` 沿着调用链向上传播（或称“传递”）。在本例中，这将回到第 16 行的 `... = coroutine.send(None)`。

协程通过第 21 行的 `coroutine.send(42)` 调用恢复。协程从第 3 行 `yield` (或暂停) 的位置继续执行，并执行其主体中的剩余语句。协程完成后，它会引发一个 [`StopIteration`](https://docs.python.org/zh-cn/3.14/library/exceptions.html#StopIteration "StopIteration") 异常，并将返回值附加在 [`value`](https://docs.python.org/zh-cn/3.14/library/exceptions.html#StopIteration.value "StopIteration.value") 属性中。

该代码片段产生以下输出：

```
Beginning coroutine main().
Awaiting rock...
Coroutine paused and returned intermediate value: 7.
Resuming coroutine and sending in value: 42.
Rock.__await__ resuming with value: 42.
Coroutine received value: 42 from rock.
Coroutine main() finished and provided value: 23.
```

这里值得暂停一下，确保您已经理解了控制流和值传递的各种方式。我们涵盖了很多重要的概念，确保您理解得足够牢固。

从协程中“yield”（或有效地放弃控制权）的唯一方法是 `await` 一个在其 `__await__` 方法中 `yield` 的对象。这听起来可能有点奇怪。你可能会想：

> 1. What about a `yield` directly within the coroutine function? The coroutine function becomes an [async generator function](https://docs.python.org/zh-cn/3.14/reference/expressions.html#asynchronous-generator-functions), a different beast entirely.
> 
> 2. What about a [yield from](https://docs.python.org/zh-cn/3.14/reference/expressions.html#yieldexpr) within the coroutine function to a (plain) generator? That causes the error: `SyntaxError: yield from not allowed in a coroutine.` This was intentionally designed for the sake of simplicity -- mandating only one way of using coroutines. Initially `yield` was barred as well, but was re-accepted to allow for async generators. Despite that, `yield from` and `await` effectively do the same thing.

### Future[](https://docs.python.org/zh-cn/3.14/howto/a-conceptual-overview-of-asyncio.html#futures "Link to this heading")

[Future](https://docs.python.org/zh-cn/3.14/library/asyncio-future.html#asyncio-future-obj) 是一个用来表示计算状态和结果的对象。该术语指的是尚未发生的事情，而 Future 对象则是一种用来关注这些事情的方式。

Future 对象有几个重要的属性。其一是它的状态，可以是“待处理”、“已取消”或“已完成”。其二是它的结果，当状态转换为已完成时它就会被设定。 与协程不同，Future 并不代表要执行的实际计算；相反，它代表该计算的状态和结果，有点像一个状态灯（红色、黄色或绿色）或指示器。

为了获得这些功能，[`asyncio.Task`](https://docs.python.org/zh-cn/3.14/library/asyncio-task.html#asyncio.Task "asyncio.Task") 继承了 [`asyncio.Future`](https://docs.python.org/zh-cn/3.14/library/asyncio-future.html#asyncio.Future "asyncio.Future") 类。上一节提到任务存储了一个回调函数列表，这并不完全准确。实际上，实现这些逻辑的是 `Future` 类，而 `Task` 继承了它。

Future 也可以被直接使用（无需通过任务）。任务会在协程完成后将自身标记为已完成。而 Future 的功能更加多样，由你来指定它何时标记为已完成。因此，Future 是一个灵活的接口，你可以自定义等待和恢复的条件。

### 自制 asyncio.sleep[](https://docs.python.org/zh-cn/3.14/howto/a-conceptual-overview-of-asyncio.html#a-homemade-asyncio-sleep "Link to this heading")

我们将通过一个例子来说明如何利用 Future 来创建自己的异步睡眠变体 (`async_sleep`)，模仿了 [`asyncio.sleep()`](https://docs.python.org/zh-cn/3.14/library/asyncio-task.html#asyncio.sleep "asyncio.sleep")。

这个代码段为事件循环注册了一些任务，然后等待由 `asyncio.create_task` 创建的任务，该任务包装了 `async_sleep(3)` 协程。我们希望该任务在三秒之后才结束，但不会阻止其他任务的运行。

async def other_work():
    print("I like work. Work work.")

async def main():
    # 向事件循环添加一些其他任务，这样在异步休眠时就可以做一些事情。
    work_tasks = [
        asyncio.create_task(other_work()),
        asyncio.create_task(other_work()),
        asyncio.create_task(other_work())
    ]
    print(
        "Beginning asynchronous sleep at time: "
        f"{datetime.datetime.now().strftime("%H:%M:%S")}."
    )
    await asyncio.create_task(async_sleep(3))
    print(
        "Done asynchronous sleep at time: "
        f"{datetime.datetime.now().strftime("%H:%M:%S")}."
    )
    # asyncio.gather 有效地等待集合中的每个任务。
    await asyncio.gather(*work_tasks)

下面，我们使用 Future 来自定义控制何时将任务标记为已完成。 如果 [`future.set_result()`](https://docs.python.org/zh-cn/3.14/library/asyncio-future.html#asyncio.Future.set_result "asyncio.Future.set_result") (负责将该 Future 标记为已完成的方法) 从未被调用，那么该任务将永远不会结束。 我们还借助了另一个任务，稍后将会介绍，它将监视已过去的时间，并相应地调用 `future.set_result()`。

async def async_sleep(seconds: float):
    future = asyncio.Future()
    time_to_wake = time.time() + seconds
    # 将监视任务添加到事件循环。
    watcher_task = asyncio.create_task(_sleep_watcher(future, time_to_wake))
    # 阻塞直到 future 被标记为已完成。
    await future

下面，我们将使用一个相当简单的 `YieldToEventLoop()` 对象从其 `__await__` 方法中 `yield`，将控制权交还给事件循环。这实际上与调用 `asyncio.sleep(0)` 相同，但这种方式更为明晰，更不用说在展示如何实现 `asyncio.sleep` 时直接使用它有点作弊！

与往常一样，事件循环会轮番处理其任务，给予它们控制权并在它们暂停或完成时收回控制权。运行 `_sleep_watcher(...)` 协程的 `watcher_task` 将在事件循环的每个完整周期中被唤起一次。 在每次恢复时，它将检查时间，如果经过的时间不够，则会再次暂停并将控制权交还给事件循环。 一旦经过了足够的时间，`_sleep_watcher(...)` 会将该 Future 标记为已完成并通过退出无限的 `while` 循环来结束执行。鉴于这个辅助任务在事件循环的每个周期中只会被唤起一次，因此你应该注意到这个异步休眠将 _至少_ 休眠三秒，而不是恰好三秒。请注意 `asyncio.sleep` 也同样如此。

class YieldToEventLoop:
    def __await__(self):
        yield

async def _sleep_watcher(future, time_to_wake):
    while True:
        if time.time() >= time_to_wake:
            # 这标记 future 为已完成。
            future.set_result(None)
            break
        else:
            await YieldToEventLoop()

以下是程序的完整输出：
```

$ python custom-async-sleep.py
Beginning asynchronous sleep at time: 14:52:22.
I like work. Work work.
I like work. Work work.
I like work. Work work.
Done asynchronous sleep at time: 14:52:25.
```

你可能会觉得这种异步睡眠的实现过于复杂。确实如此。这个例子旨在通过一个简单的示例来展示 Future 的多功能性，以便可以模仿更复杂的需求。作为参考，你可以不使用 Future 来实现它，如下所示: 

```
async def simpler_async_sleep(seconds):
    time_to_wake = time.time() + seconds
    while True:
        if time.time() >= time_to_wake:
            return
        else:
            await YieldToEventLoop()
```




