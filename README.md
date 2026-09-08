# 2cz

个人博客，使用 Retypeset + Astro + Decap CMS。域名：https://2cz.com。

## 本地使用

Node 24，pnpm 10.33.0（已通过 packageManager 固定）。

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

另开终端运行：

```powershell
corepack pnpm cms:local
```

浏览 http://localhost:4321/admin/，点击登录即可本地编辑。代理仅监听 127.0.0.1，不需要 GitHub 登录。
本地模式保存到磁盘，不会自动推送 GitHub。停止本地服务后即可关闭本地后台。

## 写文章

线上入口为 https://2cz.com/admin/（首次使用需完成下面的部署配置）。
填写标题、日期、正文，可插图、预览。线上使用编辑工作流：保存草稿 → 待审核/准备发布 → 发布，最终合并到 main，Cloudflare 随即构建。
“从网站隐藏”开关开启时，文章即使在 main 也不生成公开文章页、RSS、标签条目或 OG 图。

本地后台采用直接保存模式，不使用线上审核工作流。未准备发布时请开启“从网站隐藏”。
仓库现在是公开仓库：草稿分支和隐藏文章的源文件仍可通过 GitHub 访问；网站隐藏不是保密。真正私密的草稿请留在仓库外本地目录。

## 导入本地 Markdown

方式一：后台新建文章，在正文上方选择 Markdown 文件。导入正文后填写标题、日期等字段；文中的本地图片需要通过编辑器上传。导入不会自动发布。

方式二：在项目目录运行：

```powershell
corepack pnpm import-post "D:\你的文章目录\文章.md" english-slug
```

该命令保留标题等元数据、复制文章目录内用标准 Markdown 引用的图片、转换为 /uploads/ 图片链接，并强制作为隐藏草稿导入；同名文章不会覆盖。图片路径需在文章所在目录下，不支持 Obsidian 的双链图片语法。确认后关闭 draft，再提交。

本地文章位于 src/content/posts/，标准格式：

```markdown
---
title: 文章标题
published: 2026-09-08T00:00:00.000Z
description: 一句话摘要
tags: [日常]
draft: true
lang: zh
---

从这里开始写正文。
```

## 从本地发布

先同步线上文章，再提交本次文章和图片。遇到冲突先处理，不要强推。

```powershell
git pull --rebase origin main
corepack pnpm build
git add src/content/posts public/uploads
git commit -m "Publish article"
git push origin main
```

如果已有未提交改动，请先妥善保存，再 pull。关于页面在 src/content/about/about-zh.md；网站名字、配色在 src/config.ts。

## Cloudflare Workers 部署

已确认 2cz.com 绑定现有 Worker 2czcom。沿用 Workers，不迁移 Pages。

- GitHub：itbird/2cz，生产分支 main。
- 构建命令：corepack pnpm build
- 部署命令：corepack pnpm exec wrangler deploy
- 根目录：仓库根目录。
- Node：24（.node-version）。pnpm：10.33.0。
- 关闭非生产分支构建，避免 CMS 草稿分支被部署成公开预览。
- wrangler.jsonc 指定静态目录 dist，只有 /api/auth 和其子路径优先运行认证 Worker。
- 继续保留现有自定义域名绑定，域名配置不写入 Wrangler。
- 生产构建使用独立缓存并在每次构建前清理，避免已删除文章被旧缓存保留。

### GitHub 后台登录

在 GitHub Settings → Developer settings → OAuth Apps 创建 2cz 写作后台：

- Homepage URL：https://2cz.com
- Authorization callback URL：https://2cz.com/api/auth/callback

将 Client ID / Client Secret 放入 Cloudflare Worker 2czcom 的 Runtime variables and secrets（Secret 必须选加密 Secret）：

- GITHUB_CLIENT_ID
- GITHUB_CLIENT_SECRET

不要提交真实凭据，不要粘贴到文章或聊天。设置后重新部署。
授权仅申请 public_repo，登录后校验账户对 itbird/2cz 的 push 权限。GitHub OAuth 的 public_repo 是公开仓库级权限范围，并非仅限单一仓库；如果将来改为私有仓库，需重新设计权限方案。

## 检查

```powershell
corepack pnpm test
corepack pnpm build
```

包含 OAuth 状态验证、仓库写入权限校验、本地导入默认隐藏的测试。线上 OAuth 和 Cloudflare 部署必须在账户配置完成后做端到端验证。

## 主题来源

Retypeset：https://github.com/radishzzz/astro-theme-retypeset
采用提交 a636b6d393be714cab52d3fc4baddd3f3905f701，保留 MIT LICENSE 和主题署名。
初始作者示例内容、个人统计配置和第三方截图回退已经移除。
更新主题前先检查差异；不要直接运行上游更新脚本覆盖本站的 CMS 和定制配置。
