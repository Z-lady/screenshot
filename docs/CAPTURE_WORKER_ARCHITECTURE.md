# Capture Worker 最小架构设计

版本：v0.1（Architecture Review Draft）

> 本文只定义 Capture Worker 的进程边界、目录结构、IPC 协议、生命周期与错误模型。
> 当前阶段不实现 Windows / macOS / Linux 的具体截图 API，也不决定 WGC / GDI / DXGI 的最终优先级。

---

## 1. 背景

当前 Electron 截图测试链路：

```text
Electron UI
  ↓
ScreenshotManager
  ↓
CaptureProvider
  ↓
ElectronDesktopCaptureProvider
  ↓
desktopCapturer
  ↓
Overlay / Selection / Annotation / Clipboard
```

当前项目已经验证了上层截图 UI 的基本可行性，但 `desktopCapturer` 与 Electron / Chromium 的底层捕获链绑定较深。

项目目标平台：

```text
Windows     当前优先
macOS       第二阶段
Linux       后续
```

团队现状：

```text
主技术栈：Electron / TypeScript / Web
原生开发能力：有限
Rust：已有一定基础
```

因此候选方向是：

```text
Electron 保留 UI / Session / Editor
Rust 独立进程只负责 OS Capture 能力
```

---

## 2. 架构决策

### 2.1 Capture Worker 使用独立进程

目标：

```text
Capture Native Crash
        ↓
只结束 Capture Worker
        ↓
Electron IM 主进程继续运行
```

独立进程的主要价值是故障隔离，而不是为了把 UI Native 化。

Capture Worker **不负责**：

```text
截图遮罩 UI
选区 UI
Toolbar
Canvas Annotation
Undo / Redo
文字 / 马赛克
Clipboard UI
IM 业务
```

Capture Worker **负责**：

```text
Display 枚举
屏幕 Capture
Window 枚举（后续）
Window hit-test（后续）
DPI / Scale 信息
系统截图权限状态
平台 Capture Backend
```

---

## 3. 总体结构

```text
Electron IM
│
├── Renderer
│     └── Screenshot Editor
│           ├── Overlay
│           ├── Selection
│           ├── Toolbar
│           ├── Canvas
│           └── Annotation
│
├── Main Process
│     ├── ScreenshotManager
│     ├── ScreenshotSession
│     ├── CaptureClient
│     └── CaptureProvider
│
└────────────── IPC ────────────────┐
                                    │
                             Rust Capture Worker
                                    │
                           ┌────────┼────────┐
                           │        │        │
                        Windows   macOS    Linux
```

Electron 上层永远依赖：

```text
CaptureProvider
```

而不是直接依赖某个系统 API。

---

## 4. 目录结构

建议后续将当前 `native/screenshot-helper` 收敛为：

```text
native/
└── capture-worker/
    ├── Cargo.toml
    └── src/
        ├── main.rs
        │
        ├── protocol/
        │   ├── mod.rs
        │   ├── request.rs
        │   ├── response.rs
        │   └── error.rs
        │
        ├── core/
        │   ├── mod.rs
        │   ├── backend.rs
        │   ├── display.rs
        │   ├── frame.rs
        │   └── window.rs
        │
        ├── runtime/
        │   ├── mod.rs
        │   ├── server.rs
        │   └── lifecycle.rs
        │
        └── platform/
            ├── mod.rs
            │
            ├── windows/
            │   ├── mod.rs
            │   ├── display.rs
            │   ├── window.rs
            │   └── capture/
            │       ├── mod.rs
            │       ├── gdi.rs
            │       ├── wgc.rs
            │       └── dxgi.rs
            │
            ├── macos/
            │   ├── mod.rs
            │   ├── display.rs
            │   ├── permission.rs
            │   └── capture/
            │       ├── mod.rs
            │       ├── screen_capture_kit.rs
            │       └── core_graphics.rs
            │
            └── linux/
                ├── mod.rs
                ├── x11.rs
                └── portal.rs
```

当前阶段只实现：

```text
protocol/
core/
runtime/
platform/windows/
```

macOS / Linux 暂时只保留架构位置，不写实现。

---

## 5. Core 抽象

Capture Worker 内部的核心抽象不是 GDI / WGC / ScreenCaptureKit，而是：

```text
CaptureBackend
```

概念接口：

```rust
trait CaptureBackend {
    fn name(&self) -> &'static str;

    fn list_displays(
        &self,
    ) -> Result<Vec<DisplayInfo>, CaptureError>;

    fn capture_display(
        &self,
        display_id: &str,
    ) -> Result<CaptureFrame, CaptureError>;
}
```

后续可以扩展：

```rust
fn list_windows(...)
fn window_from_point(...)
fn capture_window(...)
```

原则：

```text
ScreenshotManager 不知道 GDI
CaptureClient 不知道 WGC
Renderer 不知道 ScreenCaptureKit
```

---

## 6. Display 数据模型

统一 Display 模型建议至少包含：

```text
id
x
y
width
height
pixelWidth
pixelHeight
scaleFactor
isPrimary
rotation
```

需要同时区分：

```text
逻辑坐标
物理像素
虚拟桌面坐标
```

原因：多屏 + 混合 DPI 环境下三者不能混用。

示例：

```json
{
  "id": "display-1",
  "x": 0,
  "y": 0,
  "width": 1920,
  "height": 1080,
  "pixelWidth": 2560,
  "pixelHeight": 1440,
  "scaleFactor": 1.3333,
  "isPrimary": true,
  "rotation": 0
}
```

---

## 7. IPC 协议

第一版采用：

```text
stdin / stdout
JSON Lines
```

理由：

```text
实现简单
跨平台
容易调试
容易记录日志
没有额外 socket 生命周期
后续可以替换而不影响上层 CaptureProvider
```

每一行必须是完整 JSON。

### Request

```json
{
  "id": "req-001",
  "method": "ping",
  "params": {}
}
```

### Success Response

```json
{
  "id": "req-001",
  "ok": true,
  "result": {
    "version": "0.1.0",
    "platform": "windows",
    "backend": "gdi"
  }
}
```

### Error Response

```json
{
  "id": "req-002",
  "ok": false,
  "error": {
    "code": "CAPTURE_FAILED",
    "message": "Failed to capture display",
    "details": null
  }
}
```

---

## 8. 第一阶段协议方法

只定义 4 个方法。

### 8.1 ping

用途：

```text
检查 worker 是否启动成功
获取版本 / 平台 / backend
```

### 8.2 getCapabilities

返回当前 worker 支持能力，例如：

```json
{
  "captureDisplay": true,
  "captureWindow": false,
  "windowHitTest": false,
  "permissionCheck": false
}
```

避免 Electron 通过平台判断能力。

### 8.3 listDisplays

返回所有显示器和 DPI / 坐标信息。

### 8.4 captureDisplay

输入：

```json
{
  "displayId": "display-1"
}
```

返回：

```json
{
  "displayId": "display-1",
  "image": {
    "transport": "file",
    "path": "...",
    "format": "png"
  },
  "pixelWidth": 1920,
  "pixelHeight": 1080
}
```

第一阶段不实现：

```text
captureWindow
listWindows
windowFromPoint
OCR
录屏
长截图
```

---

## 9. 图像传输

第一版：

```text
Rust Worker
    ↓
临时 PNG 文件
    ↓
返回 path
    ↓
Electron 读取
```

理由：

```text
容易实现
容易调试
不会把大图 Base64 塞进 JSON
适合先验证架构
```

明确禁止：

```text
4K Image → Base64 JSON
```

后期性能不足再升级：

```text
Shared Memory
Memory-Mapped File
Raw BGRA Buffer
```

图像传输方式不应影响业务协议。

因此协议必须带：

```text
transport
```

而不是直接固定为 `path`。

---

## 10. Electron CaptureClient 职责

Electron Main Process 中新增：

```text
CaptureClient
```

它负责：

```text
启动 Worker
监听 stdout
写 stdin
request id 匹配
超时
Worker exit
Worker crash
请求取消
临时文件清理
```

它不负责：

```text
Canvas
Overlay
Screenshot Selection
Annotation
```

推荐关系：

```text
ScreenshotManager
      ↓
CaptureProvider
      ↓
NativeCaptureProvider
      ↓
CaptureClient
      ↓
Capture Worker
```

当前 `ElectronDesktopCaptureProvider` 继续保留，用于：

```text
开发期比较
fallback
问题排查
```

---

## 11. Worker 生命周期

第一版采用：

```text
Lazy Start + Session Reuse
```

流程：

```text
第一次截图
    ↓
CaptureClient 启动 Worker
    ↓
ping
    ↓
Worker Ready
    ↓
执行截图
    ↓
保持 Worker 存活
    ↓
后续截图直接复用
```

Electron 退出时：

```text
CaptureClient shutdown
    ↓
Worker 正常退出
```

如果 Worker 异常退出：

```text
Worker Crash
    ↓
当前截图请求失败
    ↓
ScreenshotManager 收到标准错误
    ↓
IM 主进程继续运行
    ↓
下一次截图允许重新启动 Worker
```

第一版不做复杂自动重启循环，避免 crash loop。

---

## 12. Timeout

所有 Request 必须有 timeout。

初始建议：

```text
ping              2s
listDisplays      3s
captureDisplay    5s
```

这只是第一版默认值，最终根据测试数据调整。

Timeout 后：

```text
请求失败
↓
标记 Worker 状态异常
↓
必要时 terminate worker
↓
下一次截图重新拉起
```

---

## 13. 错误模型

错误 code 必须稳定，不向 Electron 泄露底层 API 错误作为业务判断条件。

第一阶段建议：

```text
INVALID_REQUEST
METHOD_NOT_FOUND
BACKEND_UNAVAILABLE
DISPLAY_NOT_FOUND
CAPTURE_FAILED
PERMISSION_DENIED
TIMEOUT
WORKER_NOT_READY
WORKER_EXITED
UNSUPPORTED_PLATFORM
INTERNAL_ERROR
```

底层原始信息进入：

```text
message / details / log
```

业务只依赖：

```text
error.code
```

---

## 14. 日志原则

stdout 是 IPC 通道，因此：

```text
stdout
只输出协议 JSON
```

日志输出：

```text
stderr
```

否则日志可能破坏 JSON Lines 协议。

日志建议包含：

```text
timestamp
level
worker pid
platform
backend
request id
operation
duration
error code
```

禁止默认记录截图图像内容。

---

## 15. Backend 选择

v0.1 架构阶段不固定最终 BackendPolicy。

Windows 预留：

```text
GDI
WGC
DXGI
```

第一阶段可以先使用实现成本最低、容易验证静态截图的 backend 打通 Worker 架构。

之后通过实际环境测试决定：

```text
默认 backend
fallback backend
远程桌面策略
虚拟显示器策略
```

不要在架构层写死：

```text
Windows = GDI
```

同理：

```text
macOS = ScreenCaptureKit 主候选
Linux = Portal / X11 按环境选择
```

---

## 16. 第一阶段明确不做的内容

为了避免范围失控，Capture Worker v0.1 不做：

```text
窗口自动吸附
窗口截图
文字识别
马赛克
录屏
长截图
图片编码优化
Shared Memory
自动 Backend Fallback
复杂 Worker Pool
macOS 实现
Linux 实现
```

这些都不能阻塞第一阶段。

---

## 17. 第一阶段验收标准

Capture Worker 自身只需要达到：

```text
1. Electron 可以成功启动 Rust Worker
2. ping 正常
3. listDisplays 正常
4. captureDisplay 正常
5. PNG 能被 Electron 读取
6. Worker 异常退出不会导致 Electron 主进程退出
7. Worker 可以在下一次截图时重新启动
8. 多次截图不会残留临时文件
```

截图 UI 是否好看，不属于这一阶段验收标准。

---

## 18. 推荐实施顺序

```text
Step 1
确定协议数据结构

Step 2
实现 Rust Worker Runtime
只支持 ping

Step 3
Electron CaptureClient
完成 spawn / request / response / timeout

Step 4
实现 listDisplays

Step 5
实现第一个 Windows CaptureBackend

Step 6
实现 captureDisplay

Step 7
NativeCaptureProvider 接入现有 ScreenshotManager

Step 8
.env.development 在 electron / native 间切换测试
```

不要一开始同时实现：

```text
Rust + WGC + 多屏 + DPI + window hit-test + UI
```

---

## 19. 当前需要 Review 的架构决策

在开始写实现代码前，只需要确认以下决策：

```text
A. Capture Native 使用独立进程
B. Worker 主语言使用 Rust
C. Screenshot UI 继续留在 Electron
D. IPC v1 使用 JSON Lines over stdio
E. 图像 v1 使用临时 PNG 文件
F. Worker 使用 Lazy Start + Reuse
G. Windows 先实现，macOS 第二，Linux 最后
H. CaptureBackend 是稳定抽象，具体系统 API 可替换
```

这些确认后，再进入实现阶段。
