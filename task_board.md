# Task Board — 第二阶段 (基础核心设施)

> 状态说明：⬜ 待完成 | 🔲 进行中 | ✅ 已完成

---

## 模块一：数据库脚本 (schema.sql)

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 1.1 | sys_user 用户档案表 | ✅ | DDL + 索引 + 外键已完成 |
| 1.2 | ai_custom_plan 双轨制计划表 | ✅ | DDL + 索引 + 外键已完成 |
| 1.3 | plan_daily_log 每日执行记录表 | ✅ | DDL + UNIQUE约束 + 外键已完成 |
| 1.4 | health_daily_record 健康打卡表 | ✅ | DDL + UNIQUE约束已完成 |
| 1.5 | ai_chat_log AI对话日志表 | ✅ | DDL + 索引 + 外键已完成 |
| 1.6 | ai_coach_config 教练配置表 | ✅ | DDL + 预置3条种子数据已完成 |
| 1.7 | community_post 社区动态表 | ✅ | DDL + 索引已完成 |
| 1.8 | sys_notification 系统通知表 | ✅ | DDL + 索引已完成 |

---

## 模块二：实体类 (Entity)

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 2.1 | SysUser.java | ✅ | MyBatis-Plus注解完整 |
| 2.2 | AiCustomPlan.java | ✅ | 含枚举类型字段 |
| 2.3 | PlanDailyLog.java | ✅ | MyBatis-Plus注解完整 |
| 2.4 | HealthDailyRecord.java | ✅ | MyBatis-Plus注解完整 |
| 2.5 | AiChatLog.java | ✅ | 含枚举类型字段 |
| 2.6 | AiCoachConfig.java | ✅ | MyBatis-Plus注解完整 |
| 2.7 | CommunityPost.java | ✅ | MyBatis-Plus注解完整 |
| 2.8 | SysNotification.java | ✅ | MyBatis-Plus注解完整 |

---

## 模块三：基础 Controller 层

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 3.1 | UserController (注册/登录) | ✅ | 接口骨架已完成，待Service实现 |
| 3.2 | AiController (教练列表/计划引导/日常辅助) | ✅ | 6个接口全部定义 |
| 3.3 | PlanController (首页/详情/打卡/日志) | ✅ | 4个接口全部定义 |
| 3.4 | HealthController (每日打卡/图表数据) | ✅ | 2个接口全部定义 |
| 3.5 | CommunityController (动态流/发帖/点赞) | ✅ | 4个接口全部定义 |

---

## 模块四：设计模式基础设施

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 4.1 | AiCoachStrategy 接口 | ✅ | 策略接口定义完成 |
| 4.2 | FatLossCoachStrategy | ✅ | 严厉减脂教练实现 |
| 4.3 | RehabCoachStrategy | ✅ | 温柔康复理疗师实现 |
| 4.4 | YogaCoachStrategy | ✅ | 耐心瑜伽导师实现 |
| 4.5 | AiCoachFactory 工厂类 | ✅ | 策略实例化工厂 |
| 4.6 | FactoryConfig Bean注册 | ✅ | Spring注入配置 |
| 4.7 | DailyCheckInEvent 事件类 | ✅ | 观察者模式事件 |
| 4.8 | NotificationObserver | ✅ | 通知观察者 |
| 4.9 | PointsObserver | ✅ | 积分观察者 |
| 4.10 | AiPlanAdjustObserver | ✅ | AI评估观察者 |

---

## 模块五：Service 实现（第二阶段核心待办）

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 5.1 | JWT工具类 + BCrypt配置 | ✅ | JwtUtil.java + SecurityConfig.java + pom.xml补充依赖 |
| 5.2 | UserServiceImpl 注册/登录/档案更新 | ✅ | BCrypt加密 + JWT签发 + 新增GET/PUT profile接口 |
| 5.3 | HealthServiceImpl 健康打卡完整逻辑 | ✅ | Upsert + DailyCheckInEvent发布 + 图表数据 |
| 5.4 | PlanServiceImpl 基础CRUD | ✅ | 连续天数算法 + 完成率计算 + getDashboard/getDetail/submitDailyLog/confirmPlan |
| 5.5 | JWT 认证拦截器 | ✅ | JwtInterceptor + WebMvcConfig注册拦截器 |
| 5.6 | AiServiceImpl 基础桩（供编译通过） | ✅ | 所有方法有返回值：PlanInit/PlanChat桩 + assistChat + 历史分页 |
| 5.7 | CommunityServiceImpl 基础实现 | ✅ | 发帖/MyBatis-Plus分页/点赞CRUD |

---

## 模块六：第三阶段 — 双轨计划核心链路

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 6.1 | DeepSeek DTO (ChatMessage/Request/Response) | ✅ | ChatMessage + DeepSeekChatRequest + DeepSeekChatResponse |
| 6.2 | RestClientConfig HTTP客户端 | ✅ | deepSeekRestClient Bean + 10s/30s超时 |
| 6.3 | PlanSessionManager Redis会话 | ✅ | 30分钟TTL + CRUD + PlanSessionData内部类 |
| 6.4 | AiServiceException + GlobalExceptionHandler | ✅ | 自定义异常 + 502 BAD_GATEWAY |
| 6.5 | AiService接口修复 | ✅ | getAssistChatHistory 返回 List\<AiChatLog\> |
| 6.6 | AiServiceImpl 完整重写 | ✅ | 5方法 + 6私有辅助 + PlanReadyResult记录类 + callDeepSeek API |
| 6.7 | PlanService/Impl getDailyLogs | ✅ | 新增接口方法 + PlanServiceImpl实现 + 归属校验 |
| 6.8 | PlanController getDailyLogs 实现 | ✅ | @DateTimeFormat LocalDate参数 + userId注入 |
| 6.9 | AiController planConfirm 完善 | ✅ | sessionExists校验 + deleteSession清理 |
| 6.10 | PointsObserver 完善 | ✅ | 写sys_notification积分奖励通知 |
| 6.11 | AiPlanAdjustObserver 完善 | ✅ | 活跃计划近7天完成率 + 评估通知 |

---

## 模块七：第四阶段 — 视觉呈现框架 (前端)

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 7.1 | CSS文件结构修复 | ✅ | community.css + profile.css新建 + health-checkin.css清理 |
| 7.2 | global.css增强 | ✅ | 暗色模式 + 骨架屏 + 空状态 + 过渡动画 + 按钮loading + 表单校验 |
| 7.3 | app.js路由增强 | ✅ | URL hash + hashchange监听 + 全局错误边界 |
| 7.4 | api-client增强 | ✅ | 401跳转 + 30s超时 + 网络错误处理 |
| 7.5 | 首页周历彩点数据填充 | ✅ | 周一至周日计算 + themeColor彩点 |
| 7.6 | 空状态占位图完善 | ✅ | home/community/profile空状态 + CTA按钮 |
| 8.6 | 计划详情页日期选择器联动 | ✅ | loadLogForDate + 回填已有记录 + DailyTracker重初始化 |

---

## 模块八：第五阶段 — 每日辅助AI打通

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 8.1 | DailyTracker计时器模式实现 | ✅ | startTimer/pauseTimer/resetTimer + interval逻辑 + API提交 |
| 8.2 | DailyTracker计数器模式实现 | ✅ | increment/decrement + 状态管理 + API提交 |
| 8.3 | HabitCard快速操作实现 | ✅ | startTimer导航到详情页 + increment快速+1 + quickCheck刷新 |
| 8.4 | AI Classroom教练切换实现 | ✅ | 系统消息提示 + currentCoachType存储 |
| 8.5 | AI Classroom打字指示器 | ✅ | 三点跳动动画 + CSS注入 + API包裹 |
| 8.6 | 计划详情页日期选择器联动 | ✅ | loadLogForDate + 回填已有记录 + DailyTracker重初始化 |
| 8.7 | 健康打卡页计划清单集成 | ✅ | 活跃计划 + ☐/☑切换 + completedPlanIds提交 |

---

## 模块九：第六阶段 — 社交互动与观察者闭环

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 9.1 | Profile页完整实现 | ✅ | GET/PUT profile + 通知列表 + 编辑表单 + 统计数据 |
| 9.2 | Community图片上传 | ✅ | base64 FileReader + 预览缩略图 |
| 9.3 | Community评论功能 | ✅ | 内联评论section + toggle + 本地存储 |
| 9.4 | Community分页加载 | ✅ | currentPage/pageSize + loadMore按钮 |
| 9.5 | Community乐观更新 | ✅ | likedPosts Set + 即时UI切换 + 失败回滚 |
| 9.6 | 通知中心页面 | ✅ | GET /api/user/notifications + 红点未读 + 30条列表 |

---

## 模块十：第七阶段 — 测试验证与收尾

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 10.1 | 全局auth页表单验证 | ✅ | 用户名/密码/身高/体重校验 + btn-loading态 |
| 10.2 | 编译验证 | ✅ | mvn compile BUILD SUCCESS — 73源文件 |
| 10.3 | 端到端流程审查 | ✅ | 完整链路可走通：auth→home→plan-init→plan-chat→confirm→daily-log→community |

---

## 模块十一：网页端 UI 全面适配

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 11.1 | 前端结构与显示风险盘点 | ✅ | 已重新阅读入口、全局 CSS、页面 CSS、页面 JS、组件 |
| 11.2 | Web Dashboard 全局布局 | ✅ | 已取消手机壳式窄容器，1024px 以上改为侧边导航 + 宽内容区 |
| 11.3 | 首页网页端布局 | ✅ | 已实现今日计划、周历、习惯卡片、统计/AI 建议多列布局 |
| 11.4 | AI Classroom 网页端布局 | ✅ | 已实现左侧教练/场景/摘要，右侧聊天主区域 |
| 11.5 | 计划详情/健康/社区/Profile 适配 | ✅ | 已完成多列分区、卡片网格、侧栏与长文本防溢出 |
| 11.6 | 认证页与弹窗 Web 化 | ✅ | 已避免手机预览框和底部 App 式弹层 |
| 11.7 | 静态检查与浏览器验证说明 | ⬜ | JS 语法、HTML 引用、CSS 结构；记录浏览器检查可用性 |

---

## 模块十一：第八阶段 — UI风格升级与AI指导师场景化

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 11.1 | 前端 UI 文件盘点 | ✅ | 已阅读 global/home/plan-detail/health/community/profile/ai-classroom CSS、页面 JS、组件与 AI 后端接口 |
| 11.2 | 明亮圆润习惯 App 风格升级 | ✅ | 深色外层背景 + 白/浅灰内容区 + 多彩柔和胶囊习惯卡片已落地 |
| 11.3 | 主要页面响应式适配 | ✅ | desktop/tablet/mobile 下补齐列表、卡片、弹窗、导航、表单响应式与溢出保护 |
| 11.4 | AI 指导师场景配置设计 | ✅ | 8类场景统一配置：习惯建立/坏习惯戒除/复盘/目标拆解/专注/运动/睡眠/情绪支持 |
| 11.5 | 后端 AI 场景接口与服务落地 | ✅ | 新增 /api/ai/scenarios + sceneKey system prompt + assistChat 场景接入 + 本地会话兜底 |
| 11.6 | 前端 AI 指导师调用占位/接入 | ✅ | AI教室场景选择、plan-init/plan-chat sceneKey、计划详情复盘场景 assist-chat 已接入 |
| 11.7 | 数据库/配置同步 | ✅ | 本次未新增表/字段；统一场景配置落在服务层静态配置，schema.sql 无需 DDL 变更 |
| 11.8 | 检查与编译验证 | ✅ | node --check 全量前端JS通过；Java17 Maven compile/test BUILD SUCCESS |

---

## 模块十二：第九阶段 — AI 指导师场景提示词体系

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 12.1 | AI 场景 key 标准化 | ✅ | 已落地 habit_build / habit_quit / daily_checkin / weekly_review / goal_breakdown / focus_study / fitness_health / sleep_routine / emotional_support |
| 12.2 | 场景配置响应扩展 | ✅ | AiScenarioResponse 新增 description / systemPrompt / suggestedUserInputs / safetyRules / boundaries |
| 12.3 | 多场景 system prompt | ✅ | 9 个场景均包含角色定位、输出结构、个性化上下文、安全边界 |
| 12.4 | 旧 sceneKey 兼容 | ✅ | 后端保留旧大写场景 key 到新 key 的映射，避免旧前端请求直接失效 |
| 12.5 | AI 教室前端接入 | ✅ | 场景选择器切换为新 key，并补充 loading / fallback / empty response 处理 |
| 12.6 | 计划详情 AI 助手场景选择 | ✅ | 日常辅助聊天支持选择不同 AI 指导师场景，并处理发送中与空回复状态 |
| 12.7 | 数据库影响确认 | ✅ | 第一阶段为静态配置扩展，无新增表结构，无需修改 schema.sql |
| 12.8 | 验证 | ✅ | Java 17 Maven clean compile/test 通过；修改的前端 JS 文件 node --check 通过 |

---

## 模块十三：第十阶段 — 网页端亮色工作台 UI 重构

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 13.1 | 当前前端结构与风险复查 | ✅ | 已阅读入口、全局样式、页面样式、页面 JS、通用组件 |
| 13.2 | 全局亮色 Web Shell | ✅ | 已建立固定 Sidebar/Header/Main 独立滚动结构 |
| 13.3 | 左侧导航切换体验优化 | ✅ | 已补充图标、标题、说明、active 指示、hover/focus 过渡 |
| 13.4 | 首页/AI/计划/健康/社区/Profile 页面布局优化 | ✅ | 已按工作台式信息架构调整密度和响应式 |
| 13.5 | JS 交互稳定性与内联样式清理 | ✅ | 已保持 hash 路由，清理主要移动端式遮挡与内联布局 |
| 13.6 | 静态检查与可用性验证 | ✅ | JS 语法、HTML/CSS 静态检查通过；Chrome headless 完成认证页与工作台 DOM 检查 |

---

## 模块十四：第十一阶段 — UI 细节与创建计划职责边界优化

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 14.1 | 指定前端与 AI 后端文件复查 | ✅ | 已阅读入口、首页/Profile/AI CSS 与 JS、组件、AI Controller/Service/策略 |
| 14.2 | 首页 AI 指导师模块与加号入口调整 | ✅ | 已去除首页 FAB，右侧改为 AI 身份风格选择，今日计划底部保留唯一 + 入口 |
| 14.3 | 创建计划目标选择与后端 prompt 映射 | ✅ | 创建流程只选择计划目标，后端按 sceneKey 自动映射 coachType/system prompt |
| 14.4 | Profile 通知滚动与退出登录位置 | ✅ | 通知模块内部滚动，退出登录移到资料卡操作区 |
| 14.5 | 静态检查与验证 | ✅ | 前端 JS 与 HTML/CSS 静态检查通过；Java 17 Maven clean compile 通过 |

---

## 模块十五：AI 功能重构与 DeepSeek 全量接入

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 15.1 | 首页 AI 指导师入口重构 | ✅ | 首页移除风格选择列表，改为独立入口卡 + 最近对话 + 常用场景 |
| 15.2 | 独立 AI 指导师聊天界面 | ✅ | 新增 ai-coach 页面，左侧身份列表 + 右侧聊天 + 底部输入 |
| 15.3 | Build / Quit 双选入口恢复 | ✅ | 底部弹窗改回 Build / Quit 双卡片入口 |
| 15.4 | Build / Quit 细分计划类型 | ✅ | 创建计划页按方向加载细分类型，保留统一聊天流程 |
| 15.5 | 创建计划双对话框问题修复 | ✅ | 移除内嵌 topic 输入框，创建计划仅保留单聊天区域 |
| 15.6 | Prompt 分类与场景扩展 | ✅ | 后端场景新增 coach_chat / plan_creation 分类与多场景 prompt |
| 15.7 | DeepSeek v4-flash 强制模型 | ✅ | 所有 AI 调用统一走后端并强制使用 deepseekv4-flash |
| 15.8 | AI 指导师后端真实接口 | ✅ | 新增 /api/ai/coach-chat，复用 ai_chat_log 记录独立聊天 |
| 15.9 | 收口检查与提交准备 | ✅ | 前端 node --check 通过；Java 17 Maven compile/test 通过；DeepSeek 旧模型残留检查通过 |
