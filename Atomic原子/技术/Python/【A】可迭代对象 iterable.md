Python supports a concept of iteration over containers. This is implemented using two distinct methods; these are used to allow user-defined classes to support iteration. Sequences, described below in more detail, always support the iteration methods.

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
