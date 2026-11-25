# lx-music-mobile-refactored

基于洛雪音乐移动版的第三方 Android 改版，加入歌曲下载和下载管理，并调整了搜索、列表和播放页的交互。

## 原项目

原项目 **LX Music 移动版（洛雪音乐）** 由 **lyswhut** 和贡献者开发。 [原项目仓库 lyswhut/lx-music-mobile](https://github.com/lyswhut/lx-music-mobile)

## 下载安装

从本仓库的发布页选择对应设备的 APK。 [本改版的 GitHub Releases](https://github.com/pp031212/lx-music-mobile-refactored/releases)

| 设备 | APK 文件名后缀 |
| --- | --- |
| ARM64 安卓手机 | `arm64-v8a.apk` |
| x86_64 安卓模拟器 | `x86_64.apk` |

## 改版内容

- **歌曲下载**支持单曲和批量操作，可选择音质与保存目录，并在下载管理中暂停、重试和播放已下载歌曲。 [下载功能说明](doc/download.md)
- **自定义音源导入**支持用 Android 系统文件选择器批量选择本地 `.js` 文件。 [批量导入说明](doc/local-source-batch-import.md)
- **搜索和列表**更新了多选交互，修复了搜索结果滚动后出现空白以及「我的列表」长按单曲崩溃的问题。
- **播放页**在封面下方显示歌词，封面视图居中显示歌名和歌手，「定时退出」入口位于播放设置。

## 本地开发

需要 Node.js 18、JDK 17、Android SDK Platform 36、Build Tools 35.0.0 和 NDK 26.1.10909125。设置好 `ANDROID_HOME`，启动 Android 模拟器或连接已启用 USB 调试的设备。

在项目根目录安装依赖。首次构建时，如果缺少 `android/app/debug.keystore`，可以用下面的 `keytool` 命令生成本地调试签名。

```sh
npm ci
keytool -genkeypair -storetype JKS -keystore android/app/debug.keystore -storepass android -alias androiddebugkey -keypass android -dname "CN=Android Debug,O=Android,C=US" -keyalg RSA -keysize 2048 -validity 10000
npm run dev
```

## 许可证与致谢

本仓库沿用原项目的 Apache License 2.0 许可证。感谢 **lyswhut** 和所有上游贡献者。 [许可证](LICENSE) · [原项目协议](https://github.com/lyswhut/lx-music-mobile#项目协议)
