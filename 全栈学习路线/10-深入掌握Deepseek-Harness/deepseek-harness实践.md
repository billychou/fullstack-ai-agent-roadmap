### 什么是Harness


### 依赖安装


```
 songchuan.zhou@bogon  ~/git/deepseek-harness   master  pnpm --version
11.7.0

 songchuan.zhou@bogon  ~/git/deepseek-harness   master  pnpm install
native/landlock-run/packages/linux-arm64 | [WARN] Unsupported platform: wanted: {"cpu":["arm64"],"os":["linux"],"libc":["any"]} (current: {"os":"darwin","cpu":"x64","libc":"unknown"})
native/landlock-run/packages/linux-x64   | [WARN] Unsupported platform: wanted: {"cpu":["x64"],"os":["linux"],"libc":["any"]} (current: {"os":"darwin","cpu":"x64","libc":"unknown"})
Scope: all 238 workspace projects
[

packages/subprocess/subprocess-local postinstall$ node scripts/ensure-spawn-helper.mjs
└─ Done in 86ms
. postinstall$ node scripts/install-lefthook.mjs
│ sync hooks: ✔️(pre-commit, pre-merge-commit, pre-push)
└─ Done in 1.6s
[WARN] 2 other warnings
Done in 55.4s using pnpm v11.7.0

pnpm run build


pnpm dsh web

Pi6g--.js                           637.59 kB │ gzip:  47.26 kB │ map:   831.50 kB
dist/assets/vendor-Cjbwl5VI.js                              744.87 kB │ gzip: 180.73 kB │ map: 2,513.49 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```

![[Pasted image 20260817092550.png]]

Cordis是dsh底层的框架： 插件向共享上下文贡献服务
dsh默认有分析轨迹
![[Pasted image 20260818100626.png]]

