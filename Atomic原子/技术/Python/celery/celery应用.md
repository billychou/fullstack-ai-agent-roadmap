---
tags:
  - Python
  - Celery
  - 消息队列
---


用户触发任务---> Broker. --> Worker 

- Redis List 队列


**Dependency Roles**:

- **billiard**: A fork of `multiprocessing` providing the prefork worker pool implementation [requirements/default.txt1](https://github.com/celery/celery/blob/f9ea6771/requirements/default.txt#L1-L1)
- **kombu**: The messaging library used by Celery to abstract different message transports like RabbitMQ and Redis [requirements/default.txt2](https://github.com/celery/celery/blob/f9ea6771/requirements/default.txt#L2-L2)
- **vine**: A small promises/composition library used for asynchronous callbacks [requirements/default.txt3](https://github.com/celery/celery/blob/f9ea6771/requirements/default.txt#L3-L3)
- **click**: The framework used to build the Celery Command Line Interface [requirements/default.txt4](https://github.com/celery/celery/blob/f9ea6771/requirements/default.txt#L4-L4)
- **python-dateutil**: Used for complex date and scheduling logic [requirements/default.txt8](https://github.com/celery/celery/blob/f9ea6771/requirements/default.txt#L8-L8)

Sources: [requirements/default.txt1-11](https://github.com/celery/celery/blob/f9ea6771/requirements/default.txt#L1-L11) [setup.py118-121](https://github.com/celery/celery/blob/f9ea6771/setup.py#L118-L121) [setup.py150](https://github.com/celery/celery/blob/f9ea6771/setup.py#L150-L150)


## 架构

