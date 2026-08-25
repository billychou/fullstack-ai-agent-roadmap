---
tags:
  - Python
  - Celery
  - 架构
---

**Core Components:**
- **Application Layer**: `Celery` app instance, task registry, configuration.
- **Task Management**: Task definitions, Canvas workflow primitives, Beat scheduler.
- **Message Layer**: AMQP abstraction, broker connections, routing.
- **Worker Layer**: Process management, consumer, execution pools.
- **Result Layer**: Backend interface, state storage.

