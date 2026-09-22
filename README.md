# 路见 · 校园无障碍信息平台（微信小程序雏形）

面向轮椅及行动不便人群的校园无障碍地点与通行信息小程序。核心闭环：

**查地点 → 看证据 → 判断能否通过 → 现场采集 → AI 预填 → 人工确认 → 动态上报 → 状态更新 → 分享与复核**

## 开发规划

本仓库按 [`雏形开发规划.md`](./雏形开发规划.md) 分 11 个阶段实现。

## 如何打开

1. 安装并打开 **微信开发者工具**（建议最新稳定版）。
2. 「导入项目」→ 选择本目录。
3. AppID 处选择「测试号」（本项目 `project.config.json` 默认 `touristappid`）。
4. 详情 → 本地设置 勾选「不校验合法域名」（雏形使用本地 mock 数据，无网络请求）。

## 当前技术约定（雏形阶段）

- 微信小程序**原生框架**，无第三方构建。
- 数据全部走 `services/` 数据访问层，读的是 `data/` 本地 mock 数据；**页面禁止直接 import `data/`**。后续接入云开发时只需重写 `services/`。
- 通行判断为 `services/ruleEngine.js` **真实规则引擎**（作品核心）。
- AI 识图/OCR 为 `services/aiService.js` **模拟结果**，用于演示「AI 预填 → 人工确认」流程。

## 团队协作与版本管理（GitHub）

- 主仓库：GitHub 私有仓库；`main` 始终为可跑通的稳定版。
- 分支：`feat/pages-*`（页面 / 方）、`feat/services-*`（数据层与规则引擎 / 陈）、`feat/ai-data`、`docs/*`（AI 字段、数据与文档 / 张）。
- 合并：feature → Pull Request → 另一人 review + 本地跑通 → 合并 `main`。
- Commit 前缀：`feat:` `fix:` `docs:` `refactor:` `data:`。
- 进度看板见 [`开发进度.md`](./开发进度.md)，随代码一起提交。

## 待补：关联远程仓库

```bash
git remote add origin <你的 GitHub 仓库地址>
git push -u origin main
```
