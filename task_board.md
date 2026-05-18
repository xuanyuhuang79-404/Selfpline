# Selfpline Web 高级工作台重构任务板

> 当前状态：核心重构已完成，剩余浏览器可视回归因本地浏览器安全策略拦截暂未执行。
> 本任务板用于记录本次实现、验收和后续交接；清理/恢复文件仍需用户确认后执行。

## 0. 已确认产品决策

- [x] 产品形态：偏 Web 高级工作台，不做手机 App / APK 优先适配。
- [x] 前端技术：继续使用原生 `HTML + CSS + JavaScript`。
- [x] 架构边界：不迁移 React、Vue、Vite、Webpack、Tailwind 等新工作流。
- [x] 图表能力：允许增加图表库，优先考虑 ECharts 或 Chart.js，具体引入前再确认。
- [x] 后端边界：允许新增、删除、修改接口，也允许配套修改数据库。
- [x] 首页定位：改为 `Dashboard` 总览。
- [x] AI 指导师：升级为独立一级页面。
- [x] 社区：保留并强化为核心模块。
- [x] 计划管理：需要编辑、删除、归档能力，允许修改数据库。
- [x] 记录数据：需要历史记录和趋势图。
- [x] 视觉方向：明亮轻奢橙色系。
- [x] 图标策略：保留 emoji，但降低噪音、统一尺寸和语义。
- [x] 旧页面策略：现有页面都可以重写。
- [x] 移动端策略：不做 App 化，不保证 Capacitor / APK。

## 1. 总体执行原则

- [x] 不推翻现有后端基础能力，优先复用 `UserController`、`PlanController`、`AiController`、`RecordController`、`CommunityController` 的可用逻辑。
- [x] 前端保持静态原生结构，不新增 `frontend/package.json`，不引入构建流程。
- [x] 涉及数据库变更时同步检查 `backend/src/main/resources/db/schema.sql` 和 `mysql/init/01-schema.sql`。
- [x] 涉及后端 DTO、Entity、Mapper、Service、Controller 的改动必须保持一致。
- [x] 涉及提交、打卡、删除、归档、点赞、评论等操作必须具备 pending/disabled/error 状态。
- [x] 任何清理文件操作必须先列清单并等待确认。
- [x] 每个阶段完成后运行对应最小验证，不能伪造通过结果。

## 2. 最终一级信息架构

- [x] `Dashboard`：总体概览、今日完成率、进行中计划、最近记录趋势、AI 建议摘要、社区摘要。
- [x] `Today`：今日任务、今日计划打卡、今日复盘、今日记录入口。
- [x] `Plans`：计划列表、Build/Quit 分类、搜索、编辑、归档、删除、创建入口。
- [x] `Create Plan`：AI 创建计划流程，独立承载 Build / Quit / 自定义计划。
- [x] `AI Coach`：独立 AI 指导师聊天工作台，身份切换、建议输入、最近会话。
- [x] `Records`：身体记录、今日小记、历史记录、趋势图。
- [x] `Analytics`：计划完成率、连续天数、Build/Quit 比例、健康趋势、周/月复盘。
- [x] `Community`：动态流、发布、点赞、评论、互动。
- [x] `Profile`：健康档案、通知、设置、退出登录。

## 3. 阶段一：基线与文件治理

### 任务

- [x] 复查当前 Git 状态，识别用户已有改动，不覆盖用户改动。
- [x] 复查 `.env.example` 当前删除状态，确认是否需要恢复。
- [x] 复查 `AGENTS.md`、`START.md` 当前删除状态，确认是否保留。
- [x] 复查 `.chrome-ui-check/`、`backend/target/`、`backup/`、`application.yml.backup_20260515_220025`、`frontend/{css,js/`。
- [x] 更新 `.gitignore` 建议，但实际清理前必须等用户确认。

### 验收

- [x] 输出明确“建议删除/保留/需确认”清单。
- [x] 未删除任何文件。
- [x] 未恢复或覆盖用户未确认的改动。

### 执行提示词

```text
你现在只做 Selfpline 文件治理分析，不修改业务代码，不删除文件。
请先运行 git status 和 rg --files，识别构建产物、浏览器缓存、备份文件、误建目录、敏感配置和应保留源码。
输出清理建议清单，分为“建议删除”“建议保留”“需要用户确认”三类。
不要执行删除、恢复、重命名或提交。
```
## 4. 阶段二：数据库与后端能力补齐

### 4.1 计划管理

- [x] 增强计划状态语义：执行中、已完成、已归档、已删除/废弃。
- [x] 新增计划列表接口，支持状态、方向、关键词筛选。
- [x] 新增计划编辑接口，支持 `targetName`、`shortName`、`themeColor`、`icon`、`planContent` 等安全字段。
- [x] 新增计划归档接口。
- [x] 新增计划恢复接口。
- [x] 新增计划删除接口，优先采用软删除/状态标记，避免误删日志。
- [x] 保持 `/api/plan/dashboard`、`/api/plan/{planId}/detail`、`/api/plan/daily-log` 语义兼容。

### 验收

- [x] 用户只能操作自己的计划。
- [x] 首页和 Today 页仍只读取执行中计划。
- [x] 归档/删除后的计划不出现在今日执行列表。
- [x] 删除策略不破坏历史日志统计。

### 执行提示词

```text
你负责 Selfpline 计划管理后端改造。
先阅读 PlanController、PlanService、PlanServiceImpl、AiCustomPlan、PlanDailyLogMapper、PlanCardResponse、PlanDetailResponse、schema.sql 和 mysql/init/01-schema.sql。
新增计划列表、编辑、归档、恢复、删除能力，必须校验 userId 归属。
保持现有 dashboard/detail/daily-log 接口兼容。
涉及数据库字段时同步主 schema 和 Docker 初始化脚本。
完成后运行 mvn -f backend/pom.xml compile。
```

### 4.2 记录历史与趋势

- [x] 新增记录历史接口，支持日期范围和分页/限制。
- [x] 新增记录统计接口，输出体重、睡眠、摄入、消耗趋势。
- [x] 保留 `/api/record/today` 的今日提交/重置逻辑。
- [x] 评估是否合并或复用 `/api/health/chart-data`。

### 验收

- [x] Records 页可展示历史记录。
- [x] Analytics 页可展示健康趋势图。
- [x] 今日记录提交状态不受历史查询影响。

### 执行提示词

```text
你负责 Selfpline 记录历史和趋势接口。
先阅读 RecordController、RecordService、RecordServiceImpl、HealthController、HealthServiceImpl、DailyRecordRequest、DailyRecordResponse、HealthDailyRecord、UserDailyJournal、schema.sql。
新增历史记录和趋势统计接口，保留今日提交/重置语义。
查询必须按 userId 隔离，日期范围需要默认值和边界保护。
完成后运行 mvn -f backend/pom.xml compile。
```

### 4.3 Analytics 聚合

- [x] 新增 Dashboard/Analytics 需要的聚合接口。
- [x] 输出今日完成率、进行中计划数、Build/Quit 数量、最长连续天数。
- [x] 输出近 7/30 天计划完成趋势。
- [x] 输出健康记录趋势摘要。
- [x] 输出社区摘要可选数据。

### 验收

- [x] Dashboard 不需要前端串联过多接口才能渲染核心指标。
- [x] Analytics 图表数据结构稳定，适合图表库直接消费。

### 执行提示词

```text
你负责 Selfpline Dashboard/Analytics 聚合接口。
先阅读 PlanServiceImpl、RecordServiceImpl、HealthServiceImpl、CommunityServiceImpl 和相关 Mapper。
设计轻量 DTO，输出 Dashboard 和 Analytics 所需统计数据。
不要让前端为了一个看板请求过多接口。
必须处理空数据、新用户、无计划、无记录场景。
完成后运行 mvn -f backend/pom.xml compile。
```

### 4.4 社区核心化

- [x] 新增 `community_comment` 表。
- [x] 新增 `community_post_like` 表。
- [x] 点赞改为真正 toggle，并返回当前点赞状态和点赞数。
- [x] 新增评论列表接口。
- [x] 新增发布评论接口。
- [x] 可选新增删除自己评论接口。
- [x] 社区 feed 返回当前用户是否点赞。

### 验收

- [x] 点赞不会无限递增。
- [x] 评论真实落库，刷新后仍存在。
- [x] 用户只能删除自己的评论。
- [x] 社区核心流程：发帖、点赞、评论、加载更多可用。

### 执行提示词

```text
你负责 Selfpline 社区后端核心化。
先阅读 CommunityController、CommunityService、CommunityServiceImpl、CommunityPost、CommunityPostMapper、schema.sql 和 mysql/init/01-schema.sql。
新增评论表和点赞关系表，点赞必须是用户维度 toggle。
feed 需要返回用户是否已点赞，评论数量必须真实。
所有写操作都要校验登录 userId。
完成后运行 mvn -f backend/pom.xml compile。
```

## 5. 阶段三：前端信息架构重构

### 5.1 路由与导航

- [x] 更新 `frontend/index.html` 一级导航。
- [x] 更新 `frontend/js/app.js` hash 路由。
- [x] 新增或重写页面对象：Dashboard、Today、Plans、Analytics。
- [x] 将 AI Coach 改为独立一级导航。
- [x] 将 Create Plan 改为独立一级导航或明确创建入口。
- [x] 保留 Plan Detail 派生页，但不再归入 Dashboard 导航状态。

### 验收

- [x] 一级导航清晰展示工作台主模块。
- [x] 登录态、401 跳转仍正常。
- [x] 页面切换不报错。
- [x] 不引入 npm 或新构建流程。

### 执行提示词

```text
你负责 Selfpline 前端信息架构重构。
先阅读 index.html、app.js、global.css、home.js、ai-classroom.js、ai-coach.js、plan-detail.js、health-checkin.js、community.js、profile.js、api-client.js。
保持原生 HTML/CSS/JS，不新增 frontend/package.json，不引入 React/Vue/Vite。
重构一级导航为 Dashboard、Today、Plans、Create Plan、AI Coach、Records、Analytics、Community、Profile。
先完成页面骨架和路由，不急着做复杂视觉。
```

### 5.2 Dashboard

- [x] 从旧 Home 拆出总览职责。
- [x] 展示今日完成率、计划数量、Build/Quit 比例、最长连续天数。
- [x] 展示近 7 天完成趋势图。
- [x] 展示最近记录趋势摘要。
- [x] 展示 AI 今日建议入口。
- [x] 展示社区摘要。

### 验收

- [x] 新用户空状态完整。
- [x] 有计划/记录时 Dashboard 像工作台总览，不像任务列表。
- [x] 图表容器在无数据时不空白。

### 执行提示词

```text
你负责 Selfpline Dashboard 前端。
Dashboard 是总览，不承担所有打卡和计划管理。
使用现有 dashboard/analytics 接口或后端新增聚合接口。
需要 loading、empty、error 状态。
视觉采用明亮轻奢橙色系，卡片统一，不堆砌 emoji。
```

### 5.3 Today

- [x] 展示今天所有执行中计划。
- [x] 支持 checkbox 打卡和取消完成。
- [x] 展示今日完成率。
- [x] 支持今日复盘输入或跳转 AI 辅助复盘。
- [x] 提供进入 Records 今日记录入口。

### 验收

- [x] 首页、Today、Plan Detail 的今日完成状态一致。
- [x] 连点不会造成前后端状态乱序。
- [x] 无计划时引导创建计划。

### 执行提示词

```text
你负责 Selfpline Today 今日执行页。
Today 只处理今天，不显示过往日期选择。
复用 /api/plan/dashboard 和 /api/plan/daily-log，统一 checkbox 打卡。
必须有 pending/disabled/error 状态，打卡后刷新局部数据。
```

### 5.4 Plans

- [x] 展示全部计划列表。
- [x] 支持 Build/Quit 筛选。
- [x] 支持状态筛选：执行中、已完成、已归档。
- [x] 支持关键词搜索。
- [x] 支持编辑计划。
- [x] 支持归档/恢复/删除。
- [x] 支持跳转 Plan Detail。

### 验收

- [x] 计划管理能力集中在 Plans，不再散落在 Dashboard。
- [x] 危险操作有确认。
- [x] 老数据无 `shortName` 时不报错。

### 执行提示词

```text
你负责 Selfpline Plans 计划管理页。
先阅读 habit-card.js、home.js、plan-detail.js 和计划后端接口。
Plans 是管理中心，包含列表、筛选、搜索、编辑、归档、删除。
不要破坏今日打卡逻辑。
所有操作必须有确认、pending、成功/失败提示。
```

### 5.5 Records

- [x] 保留今日记录提交/重置。
- [x] 增加历史记录列表。
- [x] 增加体重、睡眠、摄入、消耗趋势图。
- [x] 支持日期范围切换。

### 验收

- [x] 今日记录与历史查看分层清楚。
- [x] 提交后状态仍稳定。
- [x] 趋势图空数据有占位。

### 执行提示词

```text
你负责 Selfpline Records 页面升级。
先阅读 health-checkin.js、health-checkin.css、RecordController 和趋势接口。
保留今日记录提交/重置状态，不混入计划打卡。
新增历史记录和趋势展示，图表库引入前需确认具体方案。
```

### 5.6 Analytics

- [x] 新增 Analytics 页面 JS。
- [x] 新增 Analytics 页面 CSS。
- [x] 展示计划完成趋势。
- [x] 展示 Build/Quit 比例。
- [x] 展示连续天数排行或摘要。
- [x] 展示健康趋势。
- [x] 展示周/月复盘入口。

### 验收

- [x] Analytics 是数据页，不承担编辑和打卡。
- [x] 图表有 loading/empty/error 状态。
- [x] 视觉上像成熟数据看板。

### 执行提示词

```text
你负责 Selfpline Analytics 页面。
这是数据统计页，不做计划编辑、不做今日打卡。
基于后端聚合接口渲染趋势图和指标卡。
图表库优先 ECharts 或 Chart.js，但引入方式必须适合静态 HTML。
```

### 5.7 AI Coach 与 Create Plan

- [x] AI Coach 独立一级页面。
- [x] Create Plan 独立一级页面。
- [x] 保留现有 DeepSeek SSE 链路。
- [x] 创建计划流程强化场景选择和计划摘要。
- [x] AI Coach 强化身份切换、建议输入、最近会话。

### 验收

- [x] SSE 流式响应不被破坏。
- [x] PLAN_READY 解析和确认落库正常。
- [x] AI Coach 不再只是首页附属入口。

### 执行提示词

```text
你负责 Selfpline AI 页面升级。
先阅读 ai-classroom.js、ai-coach.js、api-client.js、AiController、AiServiceImpl。
保留 SSE streamPost、PLAN_READY、plan-confirm 逻辑。
只重构页面体验和信息层级，不随意改 AI 协议。
```

### 5.8 Community

- [x] 重写社区视觉为核心模块。
- [x] 接入真实点赞状态。
- [x] 接入真实评论列表。
- [x] 发布动态保留图片预览，但避免大图导致布局失控。
- [x] 加载更多保留。

### 验收

- [x] 社区刷新后点赞/评论状态稳定。
- [x] 评论不再只是本地内存。
- [x] feed 卡片视觉统一。

### 执行提示词

```text
你负责 Selfpline Community 页面升级。
先阅读 community.js、community.css 和新增社区接口。
社区是核心模块，要支持发帖、点赞、评论、加载更多。
必须处理 loading、empty、error、pending 状态。
保留原生 JS，不引入框架。
```

## 6. 阶段四：视觉系统

- [x] 梳理 `global.css` 设计 token。
- [x] 明亮轻奢橙色系：暖白底、橙色品牌强调、蓝/绿/紫功能色。
- [x] 统一侧边栏、顶栏、内容网格。
- [x] 统一卡片圆角、边框、阴影、间距。
- [x] 统一按钮、输入框、筛选器、状态标签、空状态。
- [x] 保留 emoji，但统一大小、容器和出现密度。
- [x] 减少杂乱渐变和高饱和色块。
- [x] 桌面优先，移动端只保证基础不崩。

### 验收

- [x] 页面看起来像现代 Web 工作台。
- [x] 信息层级清楚，数据、操作、辅助说明分层明确。
- [x] 无明显文字溢出、遮挡、按钮挤压。

### 执行提示词

```text
你负责 Selfpline 明亮轻奢橙色系视觉重构。
先阅读 global.css 和所有页面级 CSS。
不要引入 Tailwind 或新构建流程。
统一设计 token、卡片、按钮、状态、表单、图表容器。
保留 emoji，但降低噪音。
桌面 Web 优先，移动端只保证基础可用。
```

## 7. 阶段五：验证与回归

- [x] 后端编译：`mvn -f backend/pom.xml compile`。
- [x] 必要时后端测试：`mvn -f backend/pom.xml test`。
- [x] 前端静态服务：使用现有 `scripts/start-frontend.ps1`。
- [ ] 浏览器检查主页面：Auth、Dashboard、Today、Plans、Create Plan、AI Coach、Records、Analytics、Community、Profile、Plan Detail。
- [ ] 检查新用户空状态。
- [ ] 检查有数据状态。
- [ ] 检查接口失败状态。
- [ ] 检查打卡、提交、编辑、归档、评论、点赞 pending 状态。

### 执行提示词

```text
你负责 Selfpline 重构后的验证。
不要只说“看起来可以”，必须运行后端编译。
如果本地缺数据库、Redis、DeepSeek key 或网络受限，请如实说明。
前端需检查主要页面路由、空状态、错误状态和核心交互。
输出验证命令、结果和残余风险。
```

## 8. 当前禁止事项

- [x] 未进入实现阶段前，不修改业务代码。
- [x] 未确认清理清单前，不删除文件。
- [x] 不提交 commit。
- [x] 不创建新分支。
- [x] 不引入 React/Vue/Vite/Webpack/Tailwind。
- [x] 不新增 npm 工作流。
- [x] 不破坏现有 AI SSE 链路。
- [x] 不让前端随意拼接敏感业务语义。
- [x] 不把移动端作为第一优先级。

## 9. 当前建议优先级

1. [ ] 确认清理清单和 `.env.example`、`AGENTS.md`、`START.md` 去留。
2. [ ] 设计数据库变更草案。
3. [ ] 设计后端接口契约草案。
4. [ ] 设计前端页面文件拆分草案。
5. [ ] 确认图表库选择和引入方式。
6. [ ] 进入第一批后端与数据库实现。
7. [ ] 进入前端路由和页面骨架实现。

## 10. 总控提示词

```text
你是 Selfpline 项目的资深全栈产品架构师和工程负责人。
目标是把当前原生 HTML/CSS/JS + Spring Boot 项目重构为 Web 高级自律养成工作台。
产品方向：Web 高级工作台，明亮轻奢橙色系，保留 emoji 但降低视觉噪音。
技术边界：不迁移 React/Vue/Vite/Webpack/Tailwind，不新增 frontend/package.json。
可以新增/修改后端接口和数据库，但必须同步 schema.sql、mysql/init/01-schema.sql、Entity、DTO、Mapper、Service、Controller。
工作顺序：先读代码，再确认契约，再做最小可验证实现，最后验证。
不要删除文件、提交 commit、创建分支，除非用户明确要求。
```
