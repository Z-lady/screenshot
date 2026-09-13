# Native ScreenshotHelper

这个目录是 v1.1 最终 Native Helper 的协议与工程边界。

**当前 Electron 测试工程默认不启用它。**

原因是这次第一目标是先让你测试：

- Electron 主页面触发
- 多屏 Overlay
- 选区
- 标注
- 输出
- CaptureProvider 解耦

而不是把平台 Native API 和 UI 问题混在一次测试里。

## 最终结构

```text
ScreenshotHelper
    │
    └── CaptureBackend
          │
          ├── Windows
          │     ├── GDI
          │     ├── WGC
          │     └── DXGI
          │
          └── macOS
                ├── ScreenCaptureKit
                └── CoreGraphics fallback
```

## Windows

第一阶段建议先实现：

```text
GdiCaptureBackend
```

用于验证 sidecar 稳定性和远程/多屏环境。

之后再增加：

```text
WgcCaptureBackend
```

并根据实际测试结果形成 backend policy：

```text
WGC -> fail/crash -> GDI fallback
```

DXGI 只作为连续捕获/未来录屏等场景的 backend。

## macOS

主路径：

```text
ScreenCaptureKit
```

需考虑：

- Screen Recording permission
- x86_64
- arm64
- Universal Binary
- Code Signing
- Notarization
- TCC

CoreGraphics 只保留 legacy/fallback。

## V1 协议

控制消息：

```text
JSON Lines over stdio
```

例如：

```json
{"id":"1","method":"captureDisplay","params":{"displayId":"1"}}
```

V1 图像数据建议：

```text
Native Helper
  -> temporary PNG
  -> return path
```

不要把 4K 图片作为 Base64 放入 JSON。

## V2

性能需要时升级：

```text
shared memory / memory-mapped file
```
