
> 🔗 原文链接：[What is harness engineering and why should I care?](https://x.com/GoogleCloudTech/status/2091986652595950079)

> _Google Cloud Tech · X · @GoogleCloudTech · 2026-08-25 04:30_

> _📌 本文为转载，版权归原作者所有，全文以原文链接为准_

![](https://waytoagi.feishu.cn/space/api/box/stream/download/asynccode/?code=MzlmYjFhNmY1ZmZjOTU1ZTM5ZmFhNDRjZjViYzJiNmFfWVJJNXZ4Y3ZiQzE0cHVLbThlbkUyYW0wRXFaZ1BlYUxfVG9rZW46U3Y0UmJDR1p2b05lTnN4bUw1bWNNQm54bmZCXzE3ODc3MTQ2NzU6MTc4NzcxODI3NV9WNA&add_watermark=true&scene_type=CCM)

如何用零行手动编写的代码发布一个软件产品？

今天有位朋友问我这个问题，我意识到自己没有一个简单的答案。于是深入探究了一番。

事实证明，答案在于你如何设计你的harness系统（harness）。

**作者 @shirmeir86**

等等，什么？什么是harness工程？

这正是目前围绕编码智能体最重要趋势的原因。如今最大的问题是，如何在不逐行阅读的情况下验证 AI 生成的代码？如何确保智能体不会破坏生产环境或删除你的数据？

[我](https://openai.com/index/harness-engineering/)最近读到一个有趣的实验：一个由 3 名工程师组成的团队，用零行手动编写的代码构建并发布了软件产品的内部测试版。每一行代码——应用逻辑、测试、CI 配置、文档、可观测性和内部工具——都由 Codex 编写。

他们是怎么做到的？他们没有编写应用程序，而是设计了harness系统（harness）。

## **What exactly is a harness?（****Harness****系统到底是什么？）**

把 AI 智能体想象成一匹强大的赛马。harness系统就是赛道、眼罩和骑师的缰绳，让马沿着正确方向奔跑，而不是冲进看台。

正如我的同事 [Arthur Thompson](mailto:arthurthompson@google.com) 今天所解释的：对于智能体而言——harness系统由所有包裹 LLM 的确定性组件组成。

[Balaji Subramaniam](mailto:balajismaniam@google.com) 在他的[博客](https://medium.com/google-cloud/harness-engineering-for-multi-agent-systems-using-google-adk-2-0-e248b885cb95)**——**中详细介绍了这些确定性组件：编排层、执行沙箱、状态持久化和验证工具。

如果你想构建可靠的智能体系统，你的工作重心将从编写逻辑转变为设计环境。以下是需要关注的重点：

1. **设置严格边界：**不要让智能体随意猜测可以触碰的内容。强制执行严格的访问规则（例如将其限制在特定沙箱中），以免意外抹掉生产数据。
    
2. **构建 “修复循环”：**智能体不可避免地会犯错。一个优秀的harness系统会自动捕获错误（如构建失败或测试失败），并将这些干净的日志反馈给智能体，让它自行修复代码。
    
3. **给他们一张地图，而不是一本手册：**正如 OpenAI 团队所发现的，不要用庞大的指令文件淹没智能体。合理组织仓库结构，让智能体在工作过程中逐步发现上下文。
    

## **Show me the code（展示代码）**

在实践中这是什么样子？以下是一个使用 [Google Antigravity SDK](https://antigravity.google/product/antigravity-sdk?utm_campaign=CDR_0x91b1edb5_default_b550513795&utm_medium=external&utm_source=blog) 和 Google 的 [ADK](https://adk.dev/2.0/) 配置本地harness系统的简单示例。注意我们如何严格地将智能体限制在特定工作区（workspaces=[“./sandbox”]）并给它一个保存记忆的位置（save_dir=”./trajectories”），以便它能从之前的经验中学习。

```Plain
import os
from google.adk.labs.antigravity import AntigravityAgent
from google.antigravity import LocalAgentConfig
from google.antigravity.hooks import policy

# Ensure absolute paths for workspace containment
sandbox_dir = os.path.abspath("./sandbox")
os.makedirs(sandbox_dir, exist_ok=True)
save_dir = os.path.abspath("./trajectories")

# 1. Engineer the harness environment
sdk_config = LocalAgentConfig(
    system_instructions="You are a helpful local environment assistant.",
    workspaces=[sandbox_dir],
    # Let the agent write safely within the restricted sandbox boundary
    policies=[policy.allow_all()], 
    save_dir=save_dir,
)

# 2. Wrap the config to run the agent inside the harness
root_agent = AntigravityAgent(
    name="antigravity_assistant",
    description="Runs an Antigravity SDK agent inside ADK.",
    config=sdk_config,
)
```

![](https://waytoagi.feishu.cn/space/api/box/stream/download/asynccode/?code=MzNiNGIzYjY3NDM3YWJlNDBhN2VlMjI0Mzg1NjY2Y2JfdDNQRVltRGM4VG5RWFZYNUpLWUZOZjE2MmEwY0JjcXNfVG9rZW46SEN2UWJsZHF6bzlnVkx4ZXQyV2NHVUwxbk1iXzE3ODc3MTQ2NzU6MTc4NzcxODI3NV9WNA&add_watermark=true&scene_type=CCM)

有了这样的设计，你可以将遗留代码放入沙箱，编写一个简单的循环对其运行单元测试，然后让智能体迭代地修复自己的 bug。

## **Adding Tests（添加测试）**

那么，我们如何实际对这个沙箱中的智能体运行测试呢？ 在现代harness工程中，测试是智能体工作流图中活跃的一部分。使用引入基于图的工作流的 Google [ADK 2.0](https://adk.dev/2.0/)，你可以将测试验证步骤定义为一个简单的路由节点。

如果测试通过，任务完成。如果失败，harness系统会自动将错误循环回给智能体重试。注意**内置的 “急停开关”：**我们跟踪迭代次数，如果智能体陷入无限循环的 “破坏 - 修复” 代码中，harness系统会安全地拔掉插头。

```Plain
from google.adk.agents.context import Context
from google.adk import Event
from google.adk.events.event_actions import EventActions
from google.genai import types

# 3. Evaluate the code in the sandbox
def execution_test_node(ctx: Context):
    # Safely track our attempts to prevent infinite loops
    iteration_count = ctx.state.get("iteration_count", 0) + 1
    ctx.state["iteration_count"] = iteration_count
    
    test_passed = ctx.state.get("test_passed", False)
    feedback = ctx.state.get("feedback", "")
    
    if test_passed:
        # Success! End the workflow.
        return Event(actions=EventActions(route="END"))
        
    if iteration_count > 5:
        # The Kill Switch: The agent is stuck. Stop the loop.
        return Event(actions=EventActions(route="END"))
    
    # Failure! Feed the error trace back to the agent and loop it.
    feedback_msg = f"The unit tests failed with the following traceback:\n\n{feedback}"
    
    return Event(
        content=types.Content(role="user", parts=[types.Part(text=feedback_msg)]),
        actions=EventActions(route="loop_back")
    )
```

如果你想看到这个测试路由模式的实际应用，可以查看 Balaji 的 **[ADK harness仓库](https://github.com/balajismaniam/adk-harness-engineering/blob/main/workflows/workflows.py)**中的一个完整实现示例。

## **Wiring it all together using graph-based workflow（使用基于图的工作流将所有组件连接起来）**

要连接智能体和测试节点，你可以使用 Workflow 图来精确规划执行流程，而无需编写复杂的嵌套 Python while 循环。

可以把这想象成在赛道上画出实际的车道：

```Plain
from google.adk import Workflow

# 4. Wire the agent and the test node together into a loop
repair_loop = Workflow(
    name="repair_loop",
    edges=[
        # 1st Step: Define the main sequence (START -> agent -> test node)
        ("START", root_agent, execution_test_node),
        
        # 2nd Step: If the test returns "loop_back", go back to the agent
        (execution_test_node, {"loop_back": root_agent})
    ]
)
Press enter or click to view image in full size
```

![](https://waytoagi.feishu.cn/space/api/box/stream/download/asynccode/?code=NDE3OTZhZGU5MDgwYmFjYTkzNmNlNzQ5ZDE3ZjZmNmNfdkxldnJxRDQyUmNpYzZOcGF1S2Z6Y3lNWUpNTVB6a2VfVG9rZW46S0tPYmJJeE43b1drSDh4cjVLa2Nrbm1Ibm1oXzE3ODc3MTQ2NzU6MTc4NzcxODI3NV9WNA&add_watermark=true&scene_type=CCM)

恭喜！你已经构建了一个自主系统。智能体编写代码并将其交给测试节点。如果测试失败并返回 loop_back 路由，智能体会带着错误日志再次尝试。

_在_ _[ADK 示例](https://github.com/google/adk-python/tree/main/contributing/samples/workflows/loop)__中查看更多循环模式示例。_

## **Try it yourself（亲自尝试）**

你可能会想，为什么需要一个 Python 脚本来运行智能体。在普通的聊天窗口中，_你_就是harness系统：你复制错误日志并盯着模型。软件harness系统让系统自我监督，让你能完全自动化测试驱动编码，或安全重构大规模遗留代码库。

要在自己的机器上运行这个自愈循环，设置时间不到五分钟：

1. **安装框架：**在终端中运行 pip install “google-adk [antigravity]” 以获取开源的 Agent Development Kit 和 Antigravity 集成。
    
2. **设置 API 密钥：**从 [Google AI Studio](https://aistudio-preprod.corp.google.com/apps) 获取免费的 Gemini API 密钥并导出到你的环境（export GEMINI_API_KEY=” your-key”）。
    
3. **运行循环：**将上面的代码块保存为 Python 脚本，把一个损坏的 Python 或 Node 文件放入新的./sandbox 目录，然后运行脚本。
    
4. **扩展你的图：**单元测试只是基线。为了让你的harness系统万无一失，可以在工作流中添加第二个 AI 智能体（如 SecurityAuditor）在代码通过前审查代码，或者接入自定义 linter 以强制执行严格的架构规则。
    

从那里，你可以将简单的测试节点替换为子进程，实际对沙箱执行 pytest 或 npm test，这样你就拥有了一个功能完备的修复循环。

如果准备扩展，你可以在 [antigravity.google](https://antigravity.google/?utm_campaign=CDR_0x91b1edb5_default_b550513795&utm_medium=external&utm_source=blog) 下载完整的 IDE 和 CLI，探索 [Antigravity 托管智能体](https://ai.google.dev/gemini-api/docs/antigravity-agent?utm_campaign=CDR_0x91b1edb5_default_b550513795&utm_medium=external&utm_source=blog)进行远程执行，以及使用 Google 的 [ADK 2.0](https://adk.dev/2.0/) 实现基于图的工作流。

## **Further reading（延伸阅读）**

我在 Google 的同事们整理了一些出色的指南，告诉你接下来可以做什么。要学习如何为智能体构建安全环境，请查看 Sara 的 codelab，其中展示了 [Cloud Run 沙箱](https://codelabs.developers.google.com/codelabs/cloud-run/cloud-run-personal-agent-coffee-shop?utm_campaign=CDR_0x91b1edb5_default_b550513795&utm_medium=external&utm_source=blog)。如果想掌握自我修正，Balaji Subramaniam 最近发布了一篇关于[编码智能体的循环工程](https://medium.com/@BalajiBuilds/61c30c9e36ca)的深度文章。要看到这一切应用于大规模企业场景，请阅读 James O’Reilly 关于[使用智能体管道和 Antigravity 自动化大规模遗留系统现代化](https://codelabs.developers.google.com/automating-modernization-with-antigravity?utm_campaign=CDR_0x91b1edb5_default_b550513795&utm_medium=external&utm_source=blog)的解析。