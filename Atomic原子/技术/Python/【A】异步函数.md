异步函数是一个由`async def` 定义的函数，异步函数或者协程函数

```
async def loudmouth_penguin(magic_number: int):
    print(
     "I am a super special talking penguin. Far cooler than that printer. "
     f"By the way, my lucky number is: {magic_number}."
    )
```

执行异步函数，返回一个协程