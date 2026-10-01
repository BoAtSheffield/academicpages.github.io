# 马博 / Bo Ma · 个人科研主页

浙江工商大学信息与电子工程学院。此版本适用于 GitHub Pages，包含最新形象照、33 条合并去重的论文初始记录及已核实的学校新闻。

## 发布

新版网站位于 `research-site/`，原 Academic Pages 模板文件保留。本仓库默认分支为 `master`。在仓库 Settings → Pages → Build and deployment 中选择 **GitHub Actions**，随后运行 “Publish research website” 工作流。仓库名为 `<账号>.github.io` 时可使用个人主页根地址；其他仓库使用 `https://<账号>.github.io/<仓库>/`，页面资源兼容这两种路径。工作流会使用 Pages 返回的正式网址生成 canonical 链接。

## 自动更新

工作流在每周一 UTC 01:00（北京时间 09:00）运行，也可手动运行。实际启动时间受 GitHub 调度影响。它读取本人学校主页、Google Scholar 固定作者 ID、ORCID 匹配的 Crossref 出版记录，以及学校、学院和科技部门的当前新闻列表。论文按标题合并去重，新闻必须来自学校允许的域名并在正文中提到马博。已有新闻在后续扫描中保留。

Google Scholar 等来源可能限制自动读取；失败时保留该来源的已有资料，记录检查时间并继续发布。新闻扫描有范围和数量限制，不等同于全网搜索。任职信息中“省派科技副总 · 国家互联网交换中心”由本人提供。

数据保存在 `data/profile.json`，更新由 GitHub 仓库自带的 `GITHUB_TOKEN` 保存，无须上传账号密码、Sites 凭据或个人访问令牌。公开仓库会公开网站源码和这些公开资料。请不要在其中加入未公开的个人或学生信息。

## 本地使用

使用 Node.js 24，先进入 `research-site/` 目录，运行 `npm ci` 安装依赖，`npm run build` 输出静态网站到 `site/`。运行 `npm run refresh` 检查公开来源。可用 `SITE_URL=https://你的账号.github.io/你的仓库 npm run build` 指定正式地址。修改外观使用 `src/render.js` 和 `src/styles.css`，更新照片使用 `public/portrait.png`。

## 已核实的新闻

2025-10-17 学校报道《恒安智卫——骑行路态感知与防卫的探索者》获得中国国际大学生创新大赛（2025）全国总决赛金奖，指导教师为李传煌、刘险得、马博。

原文：https://news.zjgsu.edu.cn/3/view_23353.html
