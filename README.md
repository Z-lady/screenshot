# Electron Screenshot v1.1 Test Project

这是根据新的 v1.1 截图架构生成的**测试工程**。

当前目标不是一次性完成最终 Native 截图引擎，而是先把：

```text
触发
→ CaptureProvider
→ 多屏 Overlay
→ 选区
→ 标注
→ 导出
→ Clipboard
```

这一整条上层链路跑通。

---

## 1. 技术栈

```text
Electron
TypeScript
React
Canvas
DOM
esbuild
```

这版**不使用 electron-vite / Vite**。

原因是测试工程没有必要引入两套构建工具的版本耦合。

`esbuild` 只负责：

- main.ts
- preload.ts
- renderer.tsx

三部分编译。

---

## 2. 为什么使用 React

截图 API 本身不依赖 React。

使用 React 是因为后期 UI 会继续增加：

- 工具栏
- 颜色
- 线宽
- 文字
- 马赛克
- Undo/Redo
- OCR
- 自定义工具
- 配置状态

如果你的正式 IM 已经使用 Vue，则正式工程应该沿用 Vue，而不是为了截图额外引入 React。

核心原则始终是：

```text
Native:
Capture / Display / Window / DPI / Permission

Web:
Overlay / Selection / Toolbar / Annotation / Editor
```

---

## 3. 当前 runnable path

当前：

```text
Main Page
   ↓
ScreenshotManager
   ↓
CaptureProvider
   ↓
ElectronDesktopCaptureProvider
   ↓
desktopCapturer
   ↓
每屏一个 BrowserWindow Overlay
   ↓
选区 + 标注
   ↓
Canvas 导出
   ↓
clipboard.writeImage()
```

注意：

> `desktopCapturer` 只是测试 backend，不是最终架构。

最终替换点已经放在：

```text
src/main/screenshot/CaptureProvider.ts
src/main/screenshot/NativeHelperCaptureProvider.ts
native/screenshot-helper/
```

---

## 4. 安装

建议：

```text
Node.js 20 LTS 或 22 LTS
npm 10+
```

先检查：

```bash
node -v
npm -v
```

然后：

```bash
npm install
```

---

## 5. 校验

```bash
npm run typecheck
npm run build
```

都通过后：

```bash
npm run dev
```

---

## 6. 使用

打开主页面后点击：

```text
截屏
```

程序会：

```text
隐藏主窗口
→ 捕获所有显示器
→ 每个显示器创建一个 Overlay
→ 鼠标拖出区域
→ 显示工具栏
```

工具：

```text
↖  选区/调整
□  矩形
↗  箭头
✎  画笔
T  文字（预留，未实现）
▦  马赛克（预留，未实现）
↶  撤销
×  取消
✓  完成
```

快捷键：

```text
Esc          取消
Enter        完成
Ctrl+Z       Windows 撤销
Cmd+Z        macOS 撤销
```

完成后：

- 图片写入系统 Clipboard
- 主页面显示最近一次截图

---

## 7. 目录

```text
src/
├── main/
│   ├── index.ts
│   └── screenshot/
│       ├── CaptureProvider.ts
│       ├── ElectronDesktopCaptureProvider.ts
│       ├── NativeHelperCaptureProvider.ts
│       └── ScreenshotManager.ts
│
├── preload/
│   └── index.ts
│
├── renderer/
│   ├── main.tsx
│   ├── styles.css
│   └── global.d.ts
│
└── shared/
    └── types.ts

native/
└── screenshot-helper/
    ├── Cargo.toml
    ├── README.md
    └── src/
        ├── main.rs
        ├── backend.rs
        └── protocol.rs

docs/
└── TEST_PLAN.md
```

---

## 8. 这版可以测试什么

可以测试：

- Electron 页面触发
- desktopCapturer 当前机器行为
- 多屏 Overlay
- DPI 下的基本坐标映射
- 选区
- resize
- 矩形
- 箭头
- 画笔
- Undo
- Clipboard
- UI 交互

---

## 9. 这版不能证明什么

这版不能证明：

- GDI 一定稳定
- WGC 一定稳定
- DXGI 一定稳定
- ScreenCaptureKit 一定稳定

因为 Native Backend 还没有接入实际运行链。

这一步故意拆开做：

```text
先验证 Editor / Overlay / Session 架构

再验证 Native Capture Backend
```

否则一旦出问题，很难判断是：

```text
Native capture
还是
DPI
还是
Overlay
还是
Canvas
还是
IPC
```

---

## 10. 下一阶段

如果这版 UI / Overlay 测试通过，下一阶段只做一件事：

```text
Windows ScreenshotHelper.exe
+
GdiCaptureBackend
```

让：

```text
CaptureProvider
```

从：

```text
ElectronDesktopCaptureProvider
```

切换成：

```text
NativeHelperCaptureProvider
```

而：

- 主页面
- ScreenshotManager
- Overlay
- 选区
- Toolbar
- Canvas Editor
- Clipboard

全部不改。

随后再增加：

```text
WgcCaptureBackend
```

以及 macOS：

```text
ScreenCaptureKitBackend
```
