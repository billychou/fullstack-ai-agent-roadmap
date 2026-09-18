Python 中的可迭代对象（Iterable）是指实现了 `__iter__()` 方法（或实现了 `__getitem__()` 方法且支持序列索引）的对象，它们可以在 `for` 循环、列表推导式或内置函数中逐个提供元素。

---

### 一、 内置的可迭代类型

Python 提供了丰富的内置可迭代类型，主要可以分为以下几类：
- **序列类型（Sequence Types）**：元素有序且支持通过索引获取。
    - `list`：可变列表，如 `[1, 2, 3]`
    - `tuple`：不可变元组，如 `(1, 2, 3)`
    - `str`：字符序列，如 `"hello"`
    - `bytes` / `bytearray`：字节序列
    - `range`：惰性生成的整数序列，如 `range(0, 10)`
- **映射类型（Mapping Types）**：以键值对形式存储，迭代时默认遍历其**键（Keys）**。
    - `dict`：字典，如 `{"a": 1, "b": 2}`
- **集合类型（Set Types）**：无序且元素不重复。
    - `set`：可变集合，如 `{1, 2, 3}`
    - `frozenset`：不可变集合
- **I/O 与流对象（Stream / File Objects）**：
    - 文件对象（如 `open('file.txt')`），迭代时逐行读取内容。
        
- **生成器与迭代器类型（Generators & Iterators）**：
    - 生成器函数（含 `yield` 关键字）和生成器表达式 `(x for x in range(10))`，支持按需/惰性计算。
        
---

### 二、 如何自定义可迭代类型

自定义一个可迭代对象，通常有两种主要方式：
#### 方式 1：标准方式（实现 `__iter__()` 方法）

最优雅且符合 Python 规范的方式是在类中实现 `__iter__()` 方法，并让它返回一个**迭代器对象**（支持 `__next__()`）。可以通过使用生成器函数（`yield`）来简化这一过程。


**示例：使用生成器实现**


Python

```
class CountDown:
    def __init__(self, start):
        self.start = start

    def __iter__(self):
        # 内部使用 yield，Python 会自动将 __iter__() 包装为生成器迭代器
        current = self.start
        while current > 0:
            yield current
            current -= 1

# 使用自定义可迭代对象
countdown = CountDown(3)

for num in countdown:
    print(num)  # 输出: 3, 2, 1

# 支持多次遍历（每次调用 iter() 都会生成新的生成器）
print(list(countdown))  # 输出: [3, 2, 1]
```

**示例：分离“可迭代对象”与“迭代器类”**

如果你不想用 `yield`，也可以显式地定义一个独立的迭代器类：

Python
```
class MyRangeIterator:
    def __init__(self, start, end):
        self.current = start
        self.end = end

    def __iter__(self):
        return self

    def __next__(self):
        if self.current >= self.end:
            raise StopIteration
        val = self.current
        self.current += 1
        return val

class MyRange:
    def __init__(self, start, end):
        self.start = start
        self.end = end

    def __iter__(self):
        # 每次遍历返回一个新的迭代器实例，保证多次迭代互不干扰
        return MyRangeIterator(self.start, self.end)

# 测试
my_seq = MyRange(1, 4)
for item in my_seq:
    print(item)  # 输出: 1, 2, 3
```

---

#### 方式 2：序列协议方式（实现 `__getitem__()` 与 `__len__()`）

如果类没有定义 `__iter__()` 方法，但定义了 `__getitem__()`，Python 在执行迭代时会尝试使用从索引 `0` 开始递增的方式获取元素，直到抛出 `IndexError` 止。

Python

```
class CustomList:
    def __init__(self, items):
        self._items = items

    def __getitem__(self, index):
        return self._items[index]

    def __len__(self):
        return len(self._items)

# 测试
my_list = CustomList(["Apple", "Banana", "Cherry"])

for fruit in my_list:
    print(fruit)  # 输出: Apple, Banana, Cherry
```



Python 支持对容器进行迭代的概念。这通过两种不同的方法实现；这两种方法用于支持用户定义的类实现迭代。下文将详细介绍的序列始终支持迭代方法。

One method needs to be defined for container objects to provide [iterable](https://docs.python.org/3/glossary.html#term-iterable) support. 
- 可迭代协议
```
class Iterable(metaclass=ABCMeta):

    __slots__ = ()

    @abstractmethod
    def __iter__(self):
        while False:
            yield None

    @classmethod
    def __subclasshook__(cls, C):
        if cls is Iterable:
            return _check_methods(C, "__iter__")
        return NotImplemented

    __class_getitem__ = classmethod(GenericAlias)
```



container.__iter__()[](https://docs.python.org/3/builtins/stdtypes.html#container.__iter__ "Link to this definition") 容器.__iter__()[](https://docs.python.org/3/builtins/stdtypes.html#container.__iter__ "Link to this definition")

Return an [iterator](https://docs.python.org/3/glossary.html#term-iterator) object. The object is required to support the iterator protocol described below. If a container supports different types of iteration, additional methods can be provided to specifically request iterators for those iteration types. (An example of an object supporting multiple forms of iteration would be a tree structure which supports both breadth-first and depth-first traversal.) This method corresponds to the [`tp_iter`](https://docs.python.org/3/c-api/typeobj.html#c.PyTypeObject.tp_iter "PyTypeObject.tp_iter") slot of the type structure for Python objects in the Python/C API.

返回一个[迭代器](https://docs.python.org/3/glossary.html#term-iterator)对象。该对象需支持下文所述的迭代器协议。若一个容器支持多种迭代方式，可提供额外方法来专门请求对应迭代类型的迭代器（支持多种迭代方式的对象示例包括支持广度优先和深度优先遍历的树形结构）。该方法对应 Python/C API 中 Python 对象的类型结构的[`tp_iter`](https://docs.python.org/3/c-api/typeobj.html#c.PyTypeObject.tp_iter "PyTypeObject.tp_iter")槽位。
