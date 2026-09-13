# 测试计划

## 第一轮：功能链路

1. `npm install`
2. `npm run typecheck`
3. `npm run build`
4. `npm run dev`
5. 点击主页面“截屏”
6. 验证主窗口是否先隐藏
7. 验证每块显示器是否都有 Overlay
8. 任意显示器拖出截图区域
9. 拖动 8 个 resize handle
10. 使用矩形 / 箭头 / 画笔
11. Ctrl+Z 撤销
12. Enter 或 ✓ 完成
13. 回到主页面验证预览
14. Ctrl+V 到其他应用验证剪贴板图片
15. Esc / × 验证取消

## 第二轮：Windows 环境

请记录以下组合：

- Windows 10 / 11
- 单屏 / 双屏 / 三屏
- 100% / 125% / 150% / 混合 DPI
- Intel / AMD / NVIDIA
- 主屏切换
- 显示器热插拔
- 向日葵
- RDP
- 虚拟显示器

记录字段：

```text
OS:
Electron:
GPU:
Driver:
Displays:
DPI:
Remote software:
Screenshot success:
Crash:
Offset:
Blur:
Latency:
Notes:
```

## 第三轮：macOS

当前 Electron provider 用于 UI 测试。

重点记录：

- Intel x86_64
- Apple Silicon arm64
- 单屏 / 外接屏
- Retina / 非 Retina
- 屏幕录制权限状态
- 多 Space
- 全屏应用

## 这版暂时不要用来判断

- Native GDI 稳定性
- Native WGC 稳定性
- ScreenCaptureKit 稳定性

因为这些 backend 当前只保留架构位置，还没有接入 runnable path。
