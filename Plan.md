# 智能运动健康助手 - 系统设计与开发计划书

## 1. 项目概述
- **项目名称**：智能运动健康助手 (Smart Fitness & Health AI Agent)
- **项目目标**：基于 Java 语言和 MVC 架构开发的一款 AI Agent Web 应用，立足于"Build（养成好习惯）"与"Quit（戒除坏习惯）"的双轨制计划设计，为用户提供通过 AI 深度引导定制的个性化运动健康计划、日常数据追踪以及专业健康问答服务。
- **技术栈**：
  - **前端**：HTML5, CSS3, JavaScript (可辅以 Bootstrap 或 Vue.js 提升交互体验，使用 ECharts 实现数据可视化)。
  - **后端**：Java, Spring Boot (RESTful API 设计)。
  - **数据库**：MySQL。
- **AI 接入**：基于统一的 DeepSeek API 进行大语言模型调用，通过系统提示词（System Prompt）的配置动态切换不同教练身份。

---

## 2. 系统架构 (MVC)
本项目严格遵循 MVC (Model-View-Controller) 架构分层：
- **View (视图层)**：前端用户界面，负责数据展示与用户交互。
- **Controller (控制层)**：Spring Boot 中的 `@Controller` / `@RestController`，负责接收 HTTP 请求、参数校验并调度业务逻辑。
- **Model (模型层)**：包含核心业务逻辑 (Service层) 以及数据持久化 (Dao/Mapper层 + MySQL)，负责与数据库和第三方 AI API 进行交互。

---

## 3. 设计模式应用规范
项目中需落地以下三种经典设计模式，以保证代码的扩展性与优雅性：

### 3.1 策略模式 (Strategy Pattern)
- **应用场景**：AI 教练身份设定与交互风格的无缝切换。
- **实现逻辑**：定义统一的 `AiCoachStrategy` 接口。针对不同的教练风格，实现不同的策略类，例如 `FatLossCoachStrategy` (严厉减脂教练)、`RehabCoachStrategy` (温柔康复理疗师) 和 `YogaCoachStrategy` (耐心瑜伽导师)。所有策略类底层均统一调用 DeepSeek API，但各自负责封装并注入自己专属的系统提示词 (System Prompt)。在运行时，根据用户在前端的选择动态切换策略类，从而实现教练身份的转换。

### 3.2 工厂模式 (Factory Pattern)
- **应用场景**：AI 教练策略对象的实例化管理。
- **实现逻辑**：构建 `AiCoachFactory` 工厂类。业务层只需传入用户的选择指令（如 `"REHAB_COACH"`），工厂类负责自动实例化并返回对应的策略对象。隐藏了复杂对象的创建细节，符合开闭原则。

### 3.3 观察者模式 (Observer Pattern)
- **应用场景**：用户每日健康打卡后的系统连锁反应。
- **实现逻辑**：用户提交打卡记录为"被观察的事件"。一旦数据库写入成功，系统发布 `DailyCheckInEvent` 事件。监听该事件的"观察者"包括：通知模块（发送打卡成功站内信）、积分模块（增加用户经验值）、AI计划调整模块（触发AI评估是否需要修改明日计划）。

---

## 4. 数据库设计 (Model层)
采用 MySQL (InnoDB 引擎)，核心表结构拓展设计如下（需建立适当的外键关联与索引）：

1. **用户档案表 (`sys_user`)**：存储基础信息与身体数据。
   - `id` (BIGINT, 主键), `username` (VARCHAR(50), 唯一索引), `password` (VARCHAR(128)), `height` (DECIMAL, cm), `weight` (DECIMAL, kg), `health_goal` (VARCHAR(100), 健身目标), `medical_history` (TEXT, 病史，用于AI避险), `created_at` (DATETIME).

2. **双轨制多并发计划表 (`ai_custom_plan`)**：支持单用户多计划并发管理，并为前端卡片体系提供元数据。该表是核心业务表，承载 Build/Quit 两类计划的完整生命周期数据。
   - `id` (BIGINT, 主键), `user_id` (BIGINT, 关联 sys_user), `plan_direction` (TINYINT, 1-Build养成习惯, 2-Quit戒除习惯), `target_name` (VARCHAR(100), 如"每日阅读"或"戒吃夜宵"), `tracking_mode` (TINYINT, 1-复选框打卡 2-倒计时器 3-限额计数器), `theme_color` (VARCHAR(20), UI卡片背景底色，如 "#FF6B6B"), `icon` (VARCHAR(50), 列表主图标，如 "📖" / "🚫"), `plan_content` (TEXT, AI生成的完整计划内容，Markdown格式), `coach_type` (VARCHAR(50), 创建计划时选择的AI教练类型，用于后续会话上下文关联), `start_date` (DATE), `end_date` (DATE), `status` (TINYINT, 0-废弃 1-执行中 2-已完成), `created_at` (DATETIME).

3. **计划每日执行记录表 (`plan_daily_log`)**：每个计划的每日活动追踪记录。用户在计划详情页点击进入后，可记录当日的执行情况。
   - `id` (BIGINT, 主键), `plan_id` (BIGINT, 关联 ai_custom_plan), `user_id` (BIGINT, 关联 sys_user), `record_date` (DATE), `is_completed` (BOOLEAN, 当日是否完成), `actual_value` (DECIMAL, 实际完成量，如阅读分钟数/未吃夜宵标记/喝水杯数), `target_value` (DECIMAL, 目标量), `notes` (VARCHAR(500), 当日备注/心得), `created_at` (DATETIME).

4. **每日健康打卡表 (`health_daily_record`)**：用于生成数据可视化图表。
   - `id` (BIGINT, 主键), `user_id` (BIGINT, 关联 sys_user), `record_date` (DATE), `current_weight` (DECIMAL), `calories_intake` (INT), `calories_burned` (INT), `sleep_hours` (DECIMAL).

5. **AI对话日志表 (`ai_chat_log`)**：留存大模型 API 交互记录。区分为"计划创建引导对话"与"每日习惯辅助对话"两类。
   - `id` (BIGINT, 主键), `user_id` (BIGINT), `plan_id` (BIGINT, 关联 ai_custom_plan，为NULL时表示独立咨询对话), `conversation_type` (TINYINT, 1-计划创建引导 2-每日习惯辅助 3-独立咨询), `coach_role` (VARCHAR(50), 实际交互身份), `user_message` (TEXT), `ai_response` (TEXT), `create_time` (DATETIME).

6. **AI 教练身份配置表 (`ai_coach_config`)**：存储可选 AI 教练的元数据信息，供前端教练选择面板渲染使用。
   - `id` (BIGINT, 主键), `coach_key` (VARCHAR(50), 策略键名, 如 "FAT_LOSS_COACH"), `coach_name` (VARCHAR(50), 显示名称, 如 "严厉减脂教官"), `coach_avatar` (VARCHAR(100), 头像图标/Emoji), `coach_description` (VARCHAR(200), 教练简介), `system_prompt` (TEXT, 系统提示词), `tags` (VARCHAR(200), 标签, 如 "减脂,高强度"), `is_active` (BOOLEAN), `sort_order` (INT).

7. **运动社区动态表 (`community_post`)**：支撑社交与动态分享核心逻辑。
   - `id` (BIGINT, 主键), `user_id` (BIGINT), `content` (VARCHAR(500)), `image_url` (VARCHAR(255)), `like_count` (INT), `comment_count` (INT), `create_time` (DATETIME).

8. **系统通知表 (`sys_notification`)**：配合观察者模式使用。
   - `id` (BIGINT, 主键), `user_id` (BIGINT), `notify_type` (TINYINT), `title` (VARCHAR(100)), `content` (TEXT), `is_read` (BOOLEAN), `create_time` (DATETIME).

---

## 5. 前端页面规划 (View层)
系统采用组件化的构建思想（可基于 Vue.js 或原生 JS+现代 CSS 构建），注重响应式交互与数据可视化。包含以下7个核心模块：

### 5.1 欢迎/认证页
- **设计细节**：引入顺滑的 CSS 过渡动画与卡片式设计。注册采用分步验证（Step-by-Step）表单收集身体数值和基础病史。

### 5.2 多并发习惯追踪主页 (首页)
- **设计细节**：采用**多彩圆角卡片（Colorful Rounded Cards）**风格，完美适配"单用户多计划并发"操作。顶部横向展示一周日历视图（日期底部附有代表各个习惯状态的小彩点指示）；核心区纵向列表展示用户正在执行的全部 Build/Quit 计划。
- **卡片设计规范**：
  - 每张习惯卡片为独立圆角矩形区块，背景使用用户自定义的 `theme_color`，左侧展示 `icon` 字符图标，中间显示 `target_name` 与进度摘要。
  - **Build 类卡片**（养成习惯）：卡片右上角显示绿色正向标识（如嫩叶图标），进度条从左到右填充，视觉语言偏向生长、积累感。
  - **Quit 类卡片**（戒除习惯）：卡片右上角显示橙色警戒标识（如破碎/禁止图标），进度条展示连续坚持天数，视觉语言偏向克制、清零计数器。
  - 根据后端的 `tracking_mode`，卡片右侧直接集成不同交互组件：
    - **复选框打卡** (`tracking_mode=1`)：当日完成即勾选，带动画反馈。
    - **倒计时器** (`tracking_mode=2`)：点击开始计时，记录专注时长。
    - **限额计数器** (`tracking_mode=3`)：+/- 按钮增量操作，如"今日已喝 5/8 杯水"。
  - 点击卡片主体区域，进入该习惯的 **计划详情页（5.4）**。
- **底部悬浮动作按钮**：首页底部中间显眼的 `+` 号 FAB (Floating Action Button)，点击呼出计划创建托盘。

### 5.3 双轨计划引导向导页 (底部弹窗 Bottom Sheet)
- **设计细节**：通过首页底部 `+` 号悬浮动作按钮呼出。此组件为一个划出的**屏幕底部托盘（Bottom Sheet Modal）**。弹窗内极简陈列两种方向卡片：上侧为带有嫩叶图标的"Build (养成一个好习惯...)"，下侧为带有破碎图标的"Quit (戒除一个坏习惯...)"。点选对应版块后，隐藏托盘并携带 `direction` 模式参数一键转入 **AI 专属私教室（5.4）** 进行计划创建引导。

### 5.4 AI 专属私教室 (核心页 — 计划创建引导 + 每日辅助双模式)
该页面承担两个核心子场景：

#### 场景 A：计划创建引导模式
- **入口**：从 5.3 底部弹窗选择 Build/Quit 方向后进入，此时该计划尚未入库（处于草稿态）。
- **页面布局**：左右空间分栏（桌面端）/上下分栏（移动端）。
  - **左栏/上栏（计划清单面板，占 40%）**：显示当前进行中的 Build/Quit 计划阶段单，通过 Badge（徽标）区分"进行中"与"草稿中"状态。
  - **右栏/下栏（AI 引导对话区，占 60%）**：
    - **顶部教练切换栏**：可横向滑动选择不同的 AI 教练身份（如"严厉减脂教官"、"温柔康复理疗师"、"耐心瑜伽导师"等）。每个教练选项以头像+名称的 Chip 组件呈现，选中态高亮。数据来源于后端 `ai_coach_config` 表。
    - **对话区域**：AI 根据所选教练的 System Prompt，结合用户选择的 Build/Quit 方向，发起首轮引导提问。例如：
      - Build 方向 → "太棒了！让我们一起来规划这个新习惯。你希望每天投入多长时间？"
      - Quit 方向 → "我理解这对你很重要。告诉我这个习惯通常在什么场景下出现？"
    - **多轮对话**：AI 通过 3-5 轮渐进式提问逐步收集计划要素（目标频率、时间安排、触发场景、困难预案等），最终生成完整的计划内容并展示确认。
    - **确认入库**：用户点击"确认并开始"按钮，前端调用 `POST /api/ai/plan-confirm` 将完整计划写入 `ai_custom_plan` 表，对话日志留存至 `ai_chat_log` (conversation_type=1)，然后跳转回首页，新卡片出现在列表中。

#### 场景 B：每日习惯辅助模式
- **入口**：从首页点击某张已有习惯卡片的主体区域进入。
- **页面布局**：
  - **顶部计划信息栏**：展示该习惯名称、当前连续天数、今日完成状态标记。
  - **今日活动记录区**：核心功能区，用户在此记录当日该习惯的执行情况。
    - **日期选择器**：默认为当日，可回溯查看历史日期的记录。
    - **追踪交互组件**：根据该计划的 `tracking_mode` 渲染对应组件（复选框/计时器/计数器），用户操作后自动调用 `POST /api/plan/daily-log` 持久化。
    - **备注输入区**：文本框供用户填写当日心得或备注。
  - **AI 辅助聊天区（右下角悬浮或底部固定）**：
    - 该计划的 AI 助手已预载该习惯的上下文（计划内容 + 历史执行记录 + 用户健康档案）。
    - 系统提示词自动切换为该计划创建时所选的教练身份 + 习惯专属上下文。
    - 用户可在此与 AI 进行日常沟通，例如：
      - "今天太累了不想运动，怎么办？"
      - "给我一些保持动力的建议"
      - "帮我调整一下明天的目标"
    - 对话日志入库 `ai_chat_log` (conversation_type=2，关联 plan_id)。

### 5.5 每日健康打卡页
- **设计细节**：滑动条与数值输入框配合的交互表单。提供友好的前端非法值阻断校验，并支持勾选当日完成的 Build 计划或恪守的 Quit 计划。系统在后台记录提交完成时，通过全局 Toast 消息进行即时反馈。

### 5.6 运动社区广场页
- **设计细节**：图文瀑布流展示列表，内嵌图片预加载与平滑滚动体验；附带简约直观的点赞、评论交互组件区。

### 5.7 个人中心设置页
- **设计细节**：结构化的数据面板，维护基础设置以及关键健康预警标签（TAG）。病史信息的任何修改动作都能在全局状态中闭环关联，实时反哺于下一回对 AI `System Prompt` 组装过程之中。

---

## 6. 后端核心接口设计 (Controller层)
遵循 RESTful API 规范，全量使用标准 JSON 结构作为请求/响应格式载体，附带全局基础结果体 (`code`, `msg`, `data`)：

### 6.1 用户鉴权模块
- `POST /api/user/register`：结构化接收新用户资料与初始基础情况录入操作。
- `POST /api/user/login`：用户验证签权并下发身份 Token 凭证。

### 6.2 AI 教练元数据模块
- `GET /api/ai/coaches`：返回所有可用的 AI 教练身份列表（来源 `ai_coach_config` 表），供前端教练切换栏渲染。响应包含 `coachKey`, `coachName`, `coachAvatar`, `coachDescription`, `tags`。

### 6.3 双轨计划创建与 AI 引导模块（核心链路）

#### 6.3.1 计划初始化引导 — `POST /api/ai/plan-init`
- **用途**：用户选择 Build/Quit 方向后，发起首轮 AI 引导对话。
- **请求**：`{ "direction": "QUIT", "topic": "戒吃夜宵", "coachType": "REHAB_COACH" }`
- **后端处理流程**：
  1. Factory 模式加载对应 `coachType` 的策略实例（`AiCoachStrategy`）。
  2. 策略类拼装 System Prompt = 教练基础人设 + Build/Quit 方向话术模板 + 用户健康档案上下文。
  3. 调用 DeepSeek API，发起首轮引导提问。
  4. 创建会话 Session（UUID），存入 Redis/内存，关联当前草稿态计划上下文。
  5. 返回 AI 首轮消息 + `sessionId`。

#### 6.3.2 引导对话交互 — `POST /api/ai/plan-chat`
- **用途**：在计划创建引导过程中的多轮对话交互（计划尚未入库）。
- **请求**：`{ "sessionId": "uuid", "message": "我想每天晚上8点开始", "coachType": "REHAB_COACH" }`
- **后端处理流程**：
  1. 根据 `sessionId` 恢复对话上下文。
  2. AI 策略类注入多轮历史消息，继续引导对话。
  3. 当 AI 判定信息收集完毕（如通过 Function Calling 或特定 prompt 指令），在响应中标记 `planReady: true` 并附带 AI 生成的完整计划摘要 JSON（含建议的 `target_name`、`tracking_mode`、`theme_color`、`icon`、`plan_content` 等）。
  4. 返回 AI 回复消息 + `planReady` + 计划摘要数据。

#### 6.3.3 计划确认入库 — `POST /api/ai/plan-confirm`
- **用途**：用户确认 AI 生成的计划，正式写入数据库。
- **请求**：`{ "sessionId": "uuid", "planData": { "target_name": "...", "tracking_mode": 1, "theme_color": "#FF6B6B", "icon": "📖", "plan_content": "...", "start_date": "2026-05-14", "end_date": "2026-06-14" } }`
- **后端处理流程**：
  1. 校验 `sessionId` 有效性。
  2. INSERT `ai_custom_plan` 表，状态设为 1（执行中）。
  3. 批量将引导对话日志写入 `ai_chat_log` 表 (`conversation_type=1`)。
  4. 销毁会话 Session。
  5. 返回新建计划 `planId`。

### 6.4 计划详情与每日活动记录模块

#### 6.4.1 获取计划详情 — `GET /api/plan/{planId}/detail`
- **用途**：进入计划详情页时加载完整信息。
- **响应**：返回计划元数据 + 近 30 天每日执行记录列表 + 连续打卡天数 + 当前完成率。

#### 6.4.2 提交每日活动记录 — `POST /api/plan/daily-log`
- **用途**：在计划详情页记录/更新当日该习惯的执行情况。
- **请求**：`{ "planId": 1, "recordDate": "2026-05-14", "isCompleted": true, "actualValue": 30, "targetValue": 30, "notes": "今天状态不错" }`
- **后端处理流程**：
  1. Upsert 写入 `plan_daily_log` 表（同一 plan 同一天唯一一条记录）。
  2. 更新首页卡片展示数据。
  3. 发布 `DailyPlanRecordEvent`，触发观察者（连续达成徽章判定、AI 主动鼓励消息生成等）。

#### 6.4.3 获取每日记录 — `GET /api/plan/{planId}/daily-logs`
- **请求参数**：`startDate`, `endDate`
- **响应**：返回日期范围内的执行记录数组，供前端渲染日历热力图。

### 6.5 每日习惯辅助 AI 聊天模块

#### 6.5.1 发起/继续每日辅助对话 — `POST /api/ai/assist-chat`
- **用途**：在计划详情页内与专属 AI 助手进行日常沟通。
- **请求**：`{ "planId": 1, "message": "今天太累了不想运动怎么办？" }`
- **后端处理流程**：
  1. 查询 `ai_custom_plan` 获取该计划元数据（`coach_type`、`plan_content`、`plan_direction`）。
  2. Factory + Strategy 加载对应教练策略。
  3. 拼装 System Prompt = 教练基础人设 + 计划内容上下文 + 用户健康档案 + 近期执行记录摘要。
  4. 加载该计划历史对话记录（最近 10 轮，来源 `ai_chat_log` where plan_id and conversation_type=2）。
  5. 调用 DeepSeek API，返回 AI 回复。
  6. 异步写入 `ai_chat_log` (`conversation_type=2`, 关联 plan_id)。

#### 6.5.2 获取历史辅助对话 — `GET /api/ai/assist-chat/{planId}`
- **用途**：加载该计划下的历史 AI 对话记录。
- **请求参数**：`page`, `size`
- **响应**：分页返回对话日志列表。

### 6.6 健康打卡模块
- `POST /api/health/daily-record`：入参携带 `weight`, `calories_in`, `calories_out` 等字段数据，并可以关联勾选当日的 `plan_id` 数据。入库的同时触发系统的 `DailyCheckInEvent` 进行后续广播回调（经验结算、站内信发布）。
- `GET /api/health/chart-data`：接收时间框范畴 (`startDate`, `endDate`) 筛选条件参数字段查询并在 Controller 内组合拼装，以便于适配 ECharts 图表格式所需的多维度数据集数组输出。

### 6.7 首页数据聚合模块
- `GET /api/plan/dashboard`：返回当前用户所有执行中计划的摘要卡片数据（计划元数据 + 今日完成状态 + 连续天数 + 进度百分比），供首页卡片列表渲染。

---

## 7. 核心业务流程梳理

### 7.1 创建新习惯计划的完整流程
```
用户点击首页 "+" FAB
  → 弹出 Bottom Sheet（选择 Build 或 Quit）
  → 跳转 AI 私教室（携带 direction 参数）
  → 用户在教练切换栏选择心仪教练角色
  → POST /api/ai/plan-init（获取首轮 AI 引导提问 + sessionId）
  → 多轮对话 POST /api/ai/plan-chat（AI 逐步收集计划要素）
  → AI 判定信息完整，返回 planReady=true + 计划摘要
  → 用户确认，POST /api/ai/plan-confirm（计划入库 + 对话归档）
  → 跳转首页，新习惯卡片出现
```

### 7.2 每日记录与 AI 辅助的完整流程
```
用户点击首页某张习惯卡片
  → 进入计划详情页（GET /api/plan/{planId}/detail）
  → 查看今日活动记录区，操作追踪组件
  → POST /api/plan/daily-log（记录执行数据）
  → 用户点击 AI 辅助聊天区
  → POST /api/ai/assist-chat（教练 + 计划上下文 + 历史记录 → 个性化对话）
  → 对话持续多轮，全部关联 plan_id 归档
```

---

## 8. 阶段开发里程碑 (Milestones)

- **第一阶段 (需求与环境)**：制定数据库实体关系分析模型与对应建表工作（含新增 `plan_daily_log`、`ai_coach_config` 表），搭建完善的 Spring Boot + MySQL 的框架主工程结构环境。初始化预置 3-5 个教练身份配置数据。

- **第二阶段 (基础核心设施)**：完成登录鉴权模块、用户档案 CRUD、AI 教练策略接口定义 (`AiCoachStrategy`) 与工厂类 (`AiCoachFactory`) 实现，以及各教练策略的具体实现类（注入差异化 System Prompt）。完成健康打卡持久化逻辑通道。

- **第三阶段 (双轨计划核心链路)**：实现 `POST /api/ai/plan-init` → `plan-chat` → `plan-confirm` 的完整计划创建引导链路。实现 `ai_custom_plan` 与 `plan_daily_log` 的 CRUD 接口。完成首页卡片数据聚合接口 (`/api/plan/dashboard`)。

- **第四阶段 (视觉呈现框架)**：开发客户端全局交互逻辑页面渲染。实现首页多彩圆角卡片组件（含 Build/Quit 双态视觉区分 + tracking_mode 三种交互组件）。实现 Bottom Sheet 计划创建入口。对接 AI 私教室页面（教练切换栏 + Markdown 对话流）。导入与联调 ECharts 的图形指标可视化效果。

- **第五阶段 (每日辅助 AI 打通)**：实现计划详情页的每日活动记录区（日期选择 + 追踪组件 + 备注输入）。实现 `POST /api/ai/assist-chat` 每日习惯辅助对话功能，完成计划上下文自动注入与历史对话记忆。实现计划内嵌 AI 聊天区前端组件。

- **第六阶段 (社交互动与观察者闭环)**：搭建支持图文瀑布流社区版图功能。结合事件观察反馈理念机制完整重构业务链上的附加服务闭环（内部通知系统、连续打卡徽章、AI 主动鼓励消息）。完善社区点赞评论组件。

- **第七阶段 (测试验证发布)**：查漏补缺联调所有遗留系统隐患边界功能、修正优化规范业务流与接口注解说明并做工程打包配置发布上线准备。
