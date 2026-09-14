# Windows 打包说明

当前项目只配置 Windows x64 安装包，使用 `electron-builder + NSIS`。

## 1. 环境

建议：

```text
Node.js 22
npm 11
Windows 10 / 11 x64
```

首次拉取打包配置后执行：

```bash
npm install
```

`package.json` 新增了 `electron-builder`，因此需要重新安装依赖并更新本地 `package-lock.json`。

## 2. 生产环境变量

当前 Native Capture Worker 尚未接入，因此 `.env.production` 必须暂时使用：

```env
SCREENSHOT_PROVIDER=electron
SCREENSHOT_DEBUG=false
```

如果 `.env.production` 配置为：

```env
SCREENSHOT_PROVIDER=native
```

当前安装包虽然可以构建，但点击截图会进入尚未实现的 Native Provider，因此不可作为当前可用测试包。

## 3. 先生成 unpacked 目录

```bash
npm run pack:win
```

流程：

```text
clean
→ typecheck
→ production build
→ electron-builder --win dir --x64
```

输出目录：

```text
release/win-unpacked/
```

可直接运行其中的：

```text
Screenshot.exe
```

建议正式生成安装器前，先用该目录验证应用可以正常：

- 启动
- 截图
- 选区
- 标注
- 完成
- Clipboard
- 退出

## 4. 生成 Windows 安装包

```bash
npm run dist:win
```

流程：

```text
clean
→ typecheck
→ production build
→ electron-builder
→ NSIS installer
```

安装器输出在：

```text
release/
```

文件名格式：

```text
Screenshot-Setup-0.1.0-x64.exe
```

安装器当前配置：

```text
Windows x64 only
NSIS installer
非 one-click 安装
用户可以修改安装目录
创建桌面快捷方式
创建开始菜单快捷方式
按当前用户安装
```

## 5. 当前没有代码签名

当前工程没有配置 Windows Code Signing Certificate。

因此安装包可以正常生成和安装，但在其他机器上可能看到：

```text
Unknown publisher
Windows Defender SmartScreen warning
```

这不等于安装器损坏。

真正对外发布前，应增加企业代码签名证书并配置 electron-builder signing。

## 6. 图标

当前没有加入正式 `.ico` 图标，因此 electron-builder 会使用默认图标。

这不影响安装和运行。

正式产品发布前再增加：

```text
build/icon.ico
```

并配置：

```json
{
  "win": {
    "icon": "build/icon.ico"
  }
}
```

## 7. GitHub 下载失败

Electron / electron-builder 在安装或打包期间可能需要下载 Electron、NSIS、winCodeSign 等二进制资源。

如果机器无法访问 GitHub，可能再次出现：

```text
getaddrinfo ENOTFOUND github.com
```

这属于网络/镜像问题，不属于项目代码或打包配置错误。

## 8. 推荐验证顺序

```text
npm install
↓
npm run typecheck
↓
npm run pack:win
↓
运行 release/win-unpacked/Screenshot.exe
↓
完整测试截图流程
↓
npm run dist:win
↓
卸载旧版本
↓
双击 Setup.exe
↓
安装
↓
启动
↓
再次完整测试截图流程
```
