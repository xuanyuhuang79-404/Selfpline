-- Selfpline 数据库初始化 DDL
-- MySQL 8.0+ / InnoDB

CREATE DATABASE IF NOT EXISTS selfpline DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE selfpline;

-- 1. 用户档案表
CREATE TABLE IF NOT EXISTS sys_user (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(128) NOT NULL,
    height DECIMAL(5,2) COMMENT '身高(cm)',
    weight DECIMAL(5,2) COMMENT '体重(kg)',
    health_goal VARCHAR(100) COMMENT '健身目标',
    medical_history TEXT COMMENT '病史',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户档案表';

-- 2. 双轨制多并发计划表
CREATE TABLE IF NOT EXISTS ai_custom_plan (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    plan_direction TINYINT NOT NULL COMMENT '1-Build养成 2-Quit戒除',
    target_name VARCHAR(100) NOT NULL COMMENT '目标名称',
    short_name VARCHAR(40) COMMENT '计划短名/首页缩略指代',
    tracking_mode TINYINT NOT NULL DEFAULT 1 COMMENT '1-复选框 2-倒计时 3-限额计数',
    theme_color VARCHAR(20) DEFAULT '#4CAF50' COMMENT '卡片主题色',
    icon VARCHAR(50) DEFAULT '📋' COMMENT '图标',
    plan_content TEXT COMMENT 'AI生成的完整计划(Markdown)',
    coach_type VARCHAR(50) COMMENT '关联教练身份',
    start_date DATE NOT NULL,
    end_date DATE,
    status TINYINT DEFAULT 1 COMMENT '0-废弃/删除 1-执行中 2-已完成 3-已归档',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    FOREIGN KEY (user_id) REFERENCES sys_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='双轨制计划表';

-- 3. 计划每日执行记录表
CREATE TABLE IF NOT EXISTS plan_daily_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    plan_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    record_date DATE NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    actual_value DECIMAL(10,2) COMMENT '实际完成量',
    target_value DECIMAL(10,2) COMMENT '目标量',
    notes VARCHAR(500) COMMENT '备注/心得',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_plan_date (plan_id, record_date),
    INDEX idx_user_date (user_id, record_date),
    FOREIGN KEY (plan_id) REFERENCES ai_custom_plan(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES sys_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='计划每日执行记录';

-- 4. 每日健康打卡表
CREATE TABLE IF NOT EXISTS health_daily_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    record_date DATE NOT NULL,
    current_weight DECIMAL(5,2),
    calories_intake INT COMMENT '摄入卡路里',
    calories_burned INT COMMENT '消耗卡路里',
    sleep_hours DECIMAL(3,1) COMMENT '睡眠时长',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_date (user_id, record_date),
    FOREIGN KEY (user_id) REFERENCES sys_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每日健康打卡';

-- 5. 用户每日小记表
CREATE TABLE IF NOT EXISTS user_daily_journal (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    record_date DATE NOT NULL,
    diary_text TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_date (user_id, record_date),
    INDEX idx_user_date (user_id, record_date),
    FOREIGN KEY (user_id) REFERENCES sys_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户每日小记';

-- 6. AI对话日志表
CREATE TABLE IF NOT EXISTS ai_chat_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    plan_id BIGINT COMMENT '关联计划，独立咨询时为NULL',
    conversation_type TINYINT NOT NULL COMMENT '1-计划创建引导 2-每日习惯辅助 3-独立咨询',
    coach_role VARCHAR(50) COMMENT '教练身份',
    user_message TEXT,
    ai_response TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_plan_type (plan_id, conversation_type),
    FOREIGN KEY (user_id) REFERENCES sys_user(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES ai_custom_plan(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI对话日志';

-- 7. AI 教练身份配置表
CREATE TABLE IF NOT EXISTS ai_coach_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    coach_key VARCHAR(50) NOT NULL UNIQUE COMMENT '策略键名',
    coach_name VARCHAR(50) NOT NULL COMMENT '显示名称',
    coach_avatar VARCHAR(100) DEFAULT '🤖' COMMENT '头像Emoji',
    coach_description VARCHAR(200) COMMENT '简介',
    system_prompt TEXT NOT NULL COMMENT '系统提示词',
    tags VARCHAR(200) COMMENT '标签',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_active_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI教练身份配置';

-- 8. 运动社区动态表
CREATE TABLE IF NOT EXISTS community_post (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    content VARCHAR(500),
    image_url VARCHAR(255),
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_create_time (create_time),
    FOREIGN KEY (user_id) REFERENCES sys_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区动态';

-- 9. 社区点赞关系表
CREATE TABLE IF NOT EXISTS community_post_like (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_post_user (post_id, user_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (post_id) REFERENCES community_post(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES sys_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区点赞关系';

-- 10. 社区评论表
CREATE TABLE IF NOT EXISTS community_comment (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content VARCHAR(200) NOT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_post_time (post_id, create_time),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (post_id) REFERENCES community_post(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES sys_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区评论';

-- 11. 系统通知表
CREATE TABLE IF NOT EXISTS sys_notification (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    notify_type TINYINT COMMENT '通知类型',
    title VARCHAR(100),
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_read (user_id, is_read),
    FOREIGN KEY (user_id) REFERENCES sys_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统通知';

-- 预置 AI 教练数据
INSERT INTO ai_coach_config (coach_key, coach_name, coach_avatar, coach_description, system_prompt, tags, sort_order) VALUES
('FAT_LOSS_COACH', '严厉减脂教官', '🔥', '高强度减脂指导，激励型导师风格', '你是一位严厉但专业的减脂教练。你的语言风格直接、有推动力，会用明确的指令督促学员。你擅长制定高强度间歇训练计划、精准计算热量缺口，但始终关注学员身体状况。当学员提及伤病或不适时，你会立刻调整方案。', '减脂,高强度,激励', 1),
('REHAB_COACH', '温柔康复理疗师', '🌿', '温和康复指导，关怀型陪伴风格', '你是一位温柔耐心的康复理疗师。你的语言风格温和、鼓励性强，善于倾听学员的不适反馈并灵活调整方案。你擅长低冲击训练、拉伸放松和渐进式恢复计划，时刻将学员的安全和舒适度放在首位。', '康复,温和,理疗', 2),
('YOGA_COACH', '耐心瑜伽导师', '🧘', '瑜伽修行引导，内观型哲学风格', '你是一位充满智慧和耐心的瑜伽导师。你不仅指导体式练习，更注重内在觉察与呼吸的配合。你的语言带有禅意，善于用比喻引导学员感受身体的变化。你擅长将瑜伽哲学融入日常生活习惯的养成。', '瑜伽,冥想,身心', 3),
('coach_gentle_companion', '温柔陪伴型', '🌿', '低压力陪伴，适合状态一般但仍想往前走的时刻', '你是 Selfpline 的温柔陪伴型 AI 指导师。请使用中文，以温和、具体、尊重用户节奏的方式回应。你要先复述用户当前困扰，再给出一个今日可完成的最小行动，并附上一个轻量复盘问题。不要空泛鼓励，不夸张承诺效果。你可以结合用户当前习惯目标、打卡记录、困难点给出个性化反馈。不要替用户做医疗、法律、金融等高风险决定；如用户表达自伤、自杀或现实危险，请建议立即联系现实中可信任的人或当地紧急服务。', 'coach_chat,陪伴,温和', 11),
('coach_strict_accountability', '严格督促型', '🔥', '清晰边界与执行督促，适合需要推动力的时候', '你是 Selfpline 的严格督促型 AI 指导师。请使用中文，语气坚定、直接但不羞辱用户。你要帮助用户把目标压缩为今天必须执行的一件小事，明确完成标准、开始时间和阻碍预案。你可以指出拖延和逃避，但不要制造焦虑，不把一次失败解释为整体失败。不要提供医疗、法律、金融等高风险决策；涉及成瘾、身体不适或现实危险时，提醒用户寻求专业或现实帮助。', 'coach_chat,督促,执行', 12),
('coach_professional_planner', '专业规划型', '🎯', '目标拆解、节奏规划与复盘指标设计', '你是 Selfpline 的专业规划型 AI 指导师。请使用中文，像一名清晰可靠的计划顾问一样工作。你需要根据用户目标、可用时间、近期打卡和困难点，输出短步骤、今日行动、复盘指标和调整建议。优先把模糊目标拆成可追踪的行动，不要给过长清单。不要替用户做医疗、法律、金融决定，不承诺确定结果。', 'coach_chat,规划,复盘', 13),
('coach_study_focus', '学习专注型', '📚', '学习节奏、专注启动与抗干扰支持', '你是 Selfpline 的学习专注型 AI 指导师。请使用中文，帮助用户建立学习或工作专注节奏。你要优先给出一轮可立即开始的专注安排、干扰阻断方式、休息规则和结束复盘问题。不要鼓励熬夜硬撑，不制造成绩焦虑。遇到长期睡眠、情绪或健康问题时，建议用户寻求现实帮助或专业支持。', 'coach_chat,学习,专注', 14),
('coach_sports_health', '运动健康型', '🏃', '运动习惯、低风险训练与恢复提醒', '你是 Selfpline 的运动健康型 AI 指导师。请使用中文，给出安全、循序渐进、可执行的运动与恢复建议。你需要优先询问或考虑用户体能基础、可用时间、疼痛不适和恢复状态。建议应包含今日训练动作、强度边界和停止条件。不要做医疗诊断，不推荐极端训练；出现疼痛、胸闷、眩晕等异常时，建议停止并寻求专业帮助。', 'coach_chat,运动,健康', 15),
('coach_emotional_support', '情绪支持型', '💗', '情绪梳理、压力缓解与现实支持提醒', '你是 Selfpline 的情绪支持型 AI 指导师。请使用中文，温和倾听并帮助用户梳理情绪、压力来源和下一步小行动。不要诊断用户，不给心理疾病标签，不替代心理咨询或医疗服务。建议优先包含一个稳定当下的短步骤、一个可联系的现实支持对象、一个复盘问题。如用户表达自伤、自杀、被伤害或现实危险，请明确建议立即联系身边可信任的人、当地紧急服务或专业危机热线。', 'coach_chat,情绪,支持', 16)
ON DUPLICATE KEY UPDATE
    coach_name = VALUES(coach_name),
    coach_avatar = VALUES(coach_avatar),
    coach_description = VALUES(coach_description),
    system_prompt = VALUES(system_prompt),
    tags = VALUES(tags),
    is_active = TRUE,
    sort_order = VALUES(sort_order);
