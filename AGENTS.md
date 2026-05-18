# Selfpline 项目智能体协作准则

你是本项目的资深全栈工程师。目标不是炫技式重构，而是在充分理解现有代码和用户意图的前提下，稳定、最小、可验证地推进功能。默认使用中文沟通。

## 项目事实

- 后端位于 `backend/`，技术栈为 Spring Boot 3.2.x、Java 17、MyBatis-Plus、MySQL、Redis、JWT。
- 前端位于 `frontend/`，当前是静态 `index.html` + 原生 CSS/JS 结构，没有 `frontend/package.json`，不要凭空添加 npm、Vite、Webpack 等工作流。
- 数据库脚本源文件位于 `backend/src/main/resources/db/schema.sql`。`mysql/init/01-schema.sql` 是 Docker 初始化镜像脚本，涉及表结构变更时也要检查是否需要同步，避免本地和容器初始化不一致。
- `backend/target/` 是构建产物，除非明确排查编译结果，不要手动修改其中内容。
- 现有全局样式入口为 `frontend/css/global.css`；页面级样式位于 `frontend/css/`；页面逻辑位于 `frontend/js/pages/`；通用组件位于 `frontend/js/components/`；API 封装位于 `frontend/js/api/api-client.js`。
- 当前主导航已有首页、记录、社区、我的四个大界面。计划详情和 AI 创建计划页属于首页派生页面。
- 当前已完成基本登录注册、数据库搭建、Redis 配置、DeepSeek 接入和基础 AI 创建计划链路。

## 关键模块地图

### 登录与用户

- 前端登录注册页：`frontend/js/pages/auth.js`。
- API 封装和 401 处理：`frontend/js/api/api-client.js`。
- 后端入口：`UserController`、`UserService`、`UserServiceImpl`、`JwtInterceptor`、`JwtUtil`。

### 首页与计划卡片

- 首页：`frontend/js/pages/home.js`、`frontend/css/home.css`。
- 计划卡片组件：`frontend/js/components/habit-card.js`。
- 首页计划接口：`GET /api/plan/dashboard`，由 `PlanController.dashboard`、`PlanServiceImpl.getDashboard` 提供。
- 计划卡片 DTO：`PlanCardResponse`。新增首页显示字段时，优先从后端 DTO 明确返回，不要在前端随意截取 `targetName`。

### 记录页

- 记录页只负责身体记录和今日小记：`frontend/js/pages/health-checkin.js`、`frontend/css/health-checkin.css`。
- 接口：`GET /api/record/today`、`POST /api/record/today`、`DELETE /api/record/today`。
- 后端：`RecordController`、`RecordService`、`RecordServiceImpl`、`DailyRecordRequest`、`DailyRecordResponse`、`HealthDailyRecord`、`UserDailyJournal`。
- 记录页“提交/重置”状态只影响记录页，不要混入计划详情页的每日活动打卡。

### 每日活动计划打卡

- 计划详情页：`frontend/js/pages/plan-detail.js`、`frontend/css/plan-detail.css`。
- 每日活动记录组件：`frontend/js/components/daily-tracker.js`。
- 首页快捷打卡：`frontend/js/components/habit-card.js`。
- 接口：`POST /api/plan/daily-log`、`GET /api/plan/{planId}/daily-logs`。
- 后端：`PlanController`、`PlanService`、`PlanServiceImpl`、`PlanDailyLogMapper`、`DailyLogRequest`、`PlanDailyLog`。
- `plan_daily_log` 通过 `(plan_id, record_date)` 保证每日一条。取消打钩时保留记录并设置 `is_completed=false`，不要删除记录。

### AI 创建计划

- 前端创建页：`frontend/js/pages/ai-classroom.js`。
- 新建计划入口弹窗：`frontend/index.html` 中 `#bottom-sheet`，逻辑在 `frontend/js/components/bottom-sheet.js`。
- 后端 AI 场景集中在 `AiServiceImpl.AI_SCENARIOS`、`SCENE_COACH_TYPE_MAP`、`DEFAULT_BUILD_SCENE`、`DEFAULT_QUIT_SCENE`。
- AI 创建计划接口：`/api/ai/scenarios`、`/api/ai/plan-init/stream`、`/api/ai/plan-chat/stream`、`/api/ai/plan-confirm`。
- 计划落库由 `PlanServiceImpl.confirmPlan` 完成，涉及新增计划字段时必须同步 `AiCustomPlan`、DTO、schema 和前端展示。

## 当前下一阶段修改计划

这是基于 2026-05-18 已确认需求形成的实施计划。后续真正开始实现时，按“后端契约、数据库同步、前端接入、验证”的顺序推进。

### 1. 记录页今日日志提交与重置

目标：只针对记录页。未提交时不显示重置按钮；提交后刷新页面仍显示已提交状态，记录区域变为灰色“今日日志已提交”，并显示重置按钮；避免连续多次提交造成重复操作体验。

建议改动：

- `DailyRecordResponse` 保留 `healthRecordExists`、`journalExists`，前端用二者判断今日是否已提交。
- `health-checkin.js` 增加页面状态，例如 `this.isSubmitted`、`this.isSubmitting`。
- `loadTodayRecord()` 加载成功后，如果 `healthRecordExists || journalExists` 为真，则进入已提交 UI 状态。
- `submit()` 成功后立即切换为已提交状态，禁用提交入口，显示重置入口。
- `resetTodayRecord()` 成功后清空表单，恢复未提交状态，隐藏重置入口。
- `health-checkin.css` 增加已提交样式，注意不要固定高度导致移动端溢出。

验证重点：

- 新用户未提交时看不到重置按钮。
- 提交后不能连续点出多次提交请求。
- 刷新记录页后仍显示已提交状态。
- 重置后页面恢复可编辑，刷新后也为未提交状态。

### 2. 每日活动计划统一 checkbox 打卡

目标：今日活动计划不再查看过往日期。所有计划统一为 checkbox 打卡。点击勾选即保存今天完成；对已勾选状态重复点击会取消，后端保留当天记录但 `is_completed=false`。首页快捷打钩和详情页打钩必须绑定同一条今天记录。

建议改动：

- 后端 `submitDailyLog` 对 `/plan/daily-log` 统一使用 `LocalDate.now()` 作为 `recordDate`，避免前端传过往日期。
- `DailyLogRequest.recordDate` 可以保留兼容，但服务层不要信任前端日期。
- `PlanServiceImpl.submitDailyLog` 继续 upsert `(plan_id, today)`；取消时更新为 `isCompleted=false`、`actualValue=0`、`targetValue=1`。
- `PlanDetailPage` 移除或隐藏日期选择器，只加载今天日志。
- `DailyTracker` 简化为 checkbox 模式，初始化时根据 existingLog.isCompleted 设置 checked。
- `HabitCard.quickCheck` 改为 toggle：当前未完成提交 true，当前已完成提交 false。按钮请求期间禁用或加 pending 状态，防止连点乱序。
- 首页刷新 `HomePage.loadCards()` 后，详情页再次进入必须读到同一状态。

验证重点：

- 首页点一次完成，再进入详情页应为已勾选。
- 详情页取消后返回首页应显示未完成。
- 连续快速点击不会出现前后端状态相反。
- 后端数据库同一计划今天仍只有一条 `plan_daily_log`。

### 3. 首页计划总览 shortName

目标：创建计划时生成指代性 `shortName`，首页总览和卡片优先显示它。不要用前端随意截取计划中的几个字来当缩略名。

建议改动：

- `ai_custom_plan` 新增 `short_name` 字段，例如 `VARCHAR(40)`。
- `AiCustomPlan` 增加 `shortName`。
- `PlanCardResponse` 和必要时 `PlanDetailResponse` 增加 `shortName`。
- `PlanServiceImpl.confirmPlan` 从 `planData.shortName` 读取；如果 AI 未返回，则用保守 fallback，例如 `targetName`，不要用随机截字。
- `AiServiceImpl` 的 `[PLAN_READY]` JSON 示例加入 `shortName`，并在提示词中要求生成“短、稳定、可辨识”的计划指代名，例如“晨跑训练”“睡前阅读”“减短视频”。
- `home.js`、`habit-card.js` 使用 `shortName || targetName` 展示，`title` 或详情仍保留完整 `targetName`。

验证重点：

- 新创建计划落库有 `short_name`。
- 首页显示稳定短名，详情页仍可看到完整目标。
- 老数据没有 `short_name` 时不报错，使用 `targetName` 兜底。

### 4. 创建计划选项调整与自定义计划

目标：Build 创建计划删除“养成好习惯”和最后四个“目标拆解、学习专注、运动与健康、睡眠作息”；Build 和 Quit 都新增自定义计划选项，让用户和 AI 根据输入生成计划。

建议改动：

- 后端 `AiServiceImpl.AI_SCENARIOS` 中，创建计划列表不再暴露这些 plan_creation 旧泛场景：`habit_build`、`goal_breakdown`、`focus_study`、`fitness_health`、`sleep_routine`。
- 新增 `build_custom_plan` 和 `quit_custom_plan`，分别属于 `BUILD` 和 `QUIT`，`planCreationSupported=true`。
- 更新 `SCENE_COACH_TYPE_MAP`，为自定义场景选择默认 coachType。
- 更新 `DEFAULT_BUILD_SCENE` 或前端默认 sceneKey，避免指向被删除或不希望默认展示的场景。
- 前端 `ai-classroom.js` fallback 场景同步新增自定义选项，删除不应出现的旧选项。
- 自定义选项的提示词应要求 AI 先理解用户自由输入，再生成 `targetName`、`shortName`、`trackingMode=1`、`planDirection`、`planContent`、`themeColor`、`icon`。

验证重点：

- `/api/ai/scenarios?category=plan_creation` 返回的 Build/Quit 选项符合要求。
- 选择 Build 自定义和 Quit 自定义都能启动 stream 会话。
- 确认计划后落库方向正确，且 `shortName` 有值。

## 任务分级与执行方式

### 小任务

适用于修复一个 bug、调整一个页面样式、补充一个接口字段、优化一段提示词等范围清晰的需求。

- 直接阅读相关文件并修改。
- 不强制创建或更新 `task_board.md`。
- 不强制使用子 Agent 或外部 CLI 调度。
- 完成后运行与改动相关的最小验证命令，并说明结果。

### 中型任务

适用于跨 2-4 个文件或同时涉及前后端的小功能。

- 先用简短清单说明将修改哪些模块。
- 可以更新 `task_board.md`，但只记录与当前需求直接相关的待办。
- 按“先后端契约、再实现、再前端接入、最后验证”的顺序推进。
- 每完成一个阶段后检查源码或运行验证命令。

### 大型任务

适用于跨前端、后端、数据库、AI 配置的大功能，或用户明确要求多 Agent/并发开发时。

- 必须创建或更新根目录 `task_board.md`。
- 将任务拆解为前端、后端、数据库、AI 配置、测试验证等独立子任务。
- 只有在当前运行环境确实支持子 Agent、并且任务规模值得拆分时，才进行委派；否则由当前智能体串行推进。
- 子任务完成后必须复查对应源码，并运行可用验证命令；确认无误后再在 `task_board.md` 中标记完成。

## 修改前必须做的事

- 先用 `rg` 定位目标文件、调用方、接口定义和相关样式。
- 修改后端前，阅读 Controller、Service 接口、ServiceImpl、Mapper、Entity、DTO 中与任务相关的文件。
- 修改前端前，阅读目标页面 JS、相关组件、`global.css`、页面 CSS、API 封装。
- 修改数据库前，阅读 `backend/src/main/resources/db/schema.sql`、对应 Entity、Mapper、Service 使用点，并检查 `mysql/init/01-schema.sql` 是否需要同步。
- 修改 AI 场景前，阅读 `AiServiceImpl` 中场景定义、默认 sceneKey、coach 映射、PLAN_READY JSON 解析和前端 fallback 场景。
- 如果需求描述含糊，优先根据项目现有模式做保守实现；会造成数据丢失、接口不兼容或大范围重构时再向用户确认。

## 代码修改原则

- 保持最小变动：只改与任务直接相关的代码，不顺手重命名、不顺手重排、不做无关格式化。
- 优先复用现有结构、命名、DTO、`Result` 返回格式、CSS 变量和组件写法。
- 不调用不存在的库、工具函数、接口字段或第三方变量。
- 新增依赖前必须确认确实需要，并同步修改 `pom.xml` 或对应配置文件。
- 不手动修改 `backend/target/`、日志、临时文件、构建产物。
- 不提交或暴露 `.env`、密钥、Token、数据库密码等敏感信息。
- 不删除用户已有改动；如果遇到与当前任务相关的未提交改动，应在其基础上继续工作。

## 后端规范

- 遵守 Spring Boot 3 与 Java 17 写法。
- Controller 只做参数接收、认证用户获取、基础校验和结果返回；业务逻辑放在 Service 层。
- MyBatis-Plus 数据操作必须通过 Mapper/Service 层完成，不在 Controller 中直接拼业务查询。
- 所有外部输入 DTO 使用合适的校验或空值保护，避免潜在 `NullPointerException`。
- 涉及用户数据时必须校验归属关系，不能只凭前端传入的 ID 操作数据。
- 日期类用户行为以服务端 `LocalDate.now()` 为准，尤其是今日计划打卡，不信任前端传入过往日期。
- 统一使用项目已有 `Result`、异常处理、JWT 用户上下文方式。
- 修改表结构时必须同步更新 `schema.sql`、Entity、DTO、Service 映射，并考虑老数据兜底。

## 前端规范

- 保持 `global.css` 的设计变量和全局布局规则一致，页面 CSS 只写页面特有样式。
- API 调用统一经过 `frontend/js/api/api-client.js` 或项目已有封装，不在页面里重复散落 fetch 细节。
- 所有异步请求必须处理 loading、error、empty state；用户可见操作失败时要有提示。
- 涉及提交、重置、打钩这类状态切换时，必须有 pending/disabled 防连点保护。
- 避免固定高度导致内容重叠。优先使用 `min-height`、`max-width`、`flex`、`grid`、`clamp()`、`overflow-wrap` 等响应式方案。
- 桌面端、平板、移动端都不能出现文字遮挡、卡片溢出、按钮挤压、弹窗遮住关键操作的问题。
- 新增 UI 时优先沿用现有组件，如 toast、bottom-sheet、habit-card、coach-selector、daily-tracker。
- 登录态相关逻辑要考虑 401、Token 缺失、接口超时和网络异常。

## AI 指导师与提示词规范

- AI 场景配置应集中管理，避免把长 system prompt 零散写在多个页面或 Controller 中。
- 不同场景应有明确 `sceneKey`、名称、描述、system prompt、安全边界和推荐用户输入。
- 创建计划时 PLAN_READY JSON 必须能被后端解析，并包含落库所需字段。新增字段如 `shortName` 时，要同步更新提示词、后端确认逻辑和前端展示。
- 提示词语气应温和、具体、可执行，避免空泛鼓励和夸张承诺。
- 不让 AI 代替医疗、法律、金融等高风险专业判断。
- 情绪支持场景不得诊断用户；如用户表达自伤、自杀或现实危险，应建议立即联系现实中的可信任人员或当地紧急服务。
- 接入真实模型接口时，必须处理超时、空响应、错误响应、日志记录和用户归属校验。

## 验证要求

根据改动范围选择最小但有效的验证方式：

- 后端语法/编译：在根目录运行 `mvn -f backend/pom.xml compile`。
- 后端测试：在根目录运行 `mvn -f backend/pom.xml test`。
- 前端静态结构：检查浏览器控制台、主要页面交互、接口失败状态和响应式布局。
- 数据库变更：检查 `schema.sql`、Entity、Mapper、Service、DTO 是否同步，必要时同步 `mysql/init/01-schema.sql`。
- AI 场景变更：检查 `/api/ai/scenarios?category=plan_creation` 的返回、前端 fallback、默认 sceneKey、PLAN_READY 字段。
- 只改 Markdown 或提示词文档时，不需要运行编译，但要检查文件内容是否完整、无明显格式错误。

如果某个验证命令因为本地环境、网络、数据库、Redis、密钥缺失等原因无法完成，应如实说明失败原因，不要伪造通过结果。

## 输出要求

完成任务后，用简洁中文说明：

- 修改了哪些文件。
- 完成了什么行为变化。
- 运行了哪些验证命令，以及结果。
- 是否还有需要用户决策或后续接入的事项。
