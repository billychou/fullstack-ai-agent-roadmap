---
tags:
  - Python
  - Flask
  - 信号机制
---

Flask 中的信号（Signals）是一种轻量级的事件发布/订阅机制。简单来说，它允许应用程序在特定事件发生时（例如：模板渲染完成、请求开始处理、对象被保存等）通知所有关注该事件的订阅者（回调函数）。

通过理解以下核心概念和特性，你可以很好地掌握它：

### 1. 核心工作原理：发布与订阅

==定义信号很自由，随时随地都可以；
但订阅信号要趁早，一般放在 App 初始化或组件加载阶段。

信号的设计基于观察者模式。主要有两个角色：

- **发送者（Sender/Publisher）：** 触发事件的代码。例如，当 Flask 渲染完一个模板，它会内部触发 `template_rendered` 信号。


- **订阅者（Subscriber/Receiver）：** 关注该事件的函数。一旦信号发出，这些函数就会被依次调用。



### 2. 信号与装饰器（如 `@before_request`）的区别

Flask 提供了很多基于装饰器的钩子函数（如 `@before_request`、`@after_request`），它们和信号看起来很像，但有本质区别：

- **解耦与只读：** 信号是**完全解耦且只读**的。信号的订阅者无法中断请求、无法直接修改响应数据，也无法改变执行流程。而 `@before_request` 这样的钩子函数可以返回响应来中断后续业务。
    
- **临时性：** 信号可以方便地在特定代码块中临时订阅和取消订阅（比如在单元测试中），非常灵活。
    
- **适用场景：** 信号最适合用于**业务无关的外围监控**。例如：打点统计（Metrics）、审计日志、异步通知、自动化测试、第三方扩展开发等。如果你需要修改请求或响应，应该使用钩子函数；如果你只需要“知道这件事发生了”，应该使用信号。
    

### 3. 如何使用内置信号

Flask 核心内置了许多有用的信号（基于 `Blinker` 库实现）。

例如，如果你想在每次模板渲染时记录日志，可以使用 `@connect_via` 装饰器：

Python

```
from flask import template_rendered, app

# 订阅 template_rendered 信号，只有当指定的 app 触发时才执行
@template_rendered.connect_via(app)
def when_template_rendered(sender, template, context, **extra):
    print(f"模板 {template.name} 正在被渲染，传入的上下文为: {context}")
```

_注：在编写信号处理函数时，务必带上 `extra` 参数，以便 Flask 未来在信号中增加新参数时，你的代码不会因参数不匹配而报错。_

### 4. 自定义和发送信号

除了使用 Flask 内置的信号，你也可以在自己的业务代码（如电商系统中的“订单已支付”事件）中自定义信号：

Python

```
from blinker import Namespace

# 1. 创建命名空间和信号
my_signals = Namespace()
order_paid = my_signals.signal('order-paid')

# 2. 在业务代码中发送信号
def initialize_payment(order):
    # ... 支付逻辑 ...
    # 发送信号，把 order 对象作为关键字参数传给订阅者
    order_paid.send(current_app._get_current_object(), order=order)
```

### 5. 信号与请求上下文

Flask 的信号完整支持请求上下文。这意味着在 `request_started` 和 `request_finished` 之间触发的信号处理函数内部，你可以像在普通视图函数中一样，安全地使用 `flask.g`、`flask.request` 或 `flask.session`。

**一个小陷阱：** 在发送信号时，如果发送者是当前的 Flask 实例，请使用 `current_app._get_current_object()`，而不要直接传 `current_app`。因为 `current_app` 是一个本地代理（Proxy）对象，并不是真正的 App 实例，直接传递可能会导致订阅者无法正确匹配发送者。