-- Selfpline Database Schema
-- All tables use IF NOT EXISTS for idempotent execution

CREATE TABLE IF NOT EXISTS `ai_chat_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `plan_id` BIGINT DEFAULT NULL,
    `conversation_type` TINYINT NOT NULL COMMENT '1=PLAN_CREATION 2=DAILY_ASSIST 3=INDEPENDENT_CONSULT',
    `coach_role` VARCHAR(100) DEFAULT NULL,
    `user_message` TEXT NOT NULL,
    `ai_response` TEXT NOT NULL,
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_plan_id` (`plan_id`),
    INDEX `idx_conversation_type` (`conversation_type`),
    INDEX `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai_coach_config` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `coach_key` VARCHAR(50) NOT NULL,
    `coach_name` VARCHAR(100) NOT NULL,
    `coach_avatar` VARCHAR(255) DEFAULT NULL,
    `coach_description` VARCHAR(500) DEFAULT NULL,
    `system_prompt` TEXT,
    `tags` VARCHAR(255) DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `uk_coach_key` (`coach_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai_custom_plan` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `plan_direction` TINYINT NOT NULL COMMENT '1=BUILD 2=QUIT',
    `target_name` VARCHAR(200) NOT NULL,
    `short_name` VARCHAR(40) DEFAULT NULL COMMENT '计划短名/首页缩略指代',
    `tracking_mode` TINYINT NOT NULL COMMENT '1=CHECKBOX 2=TIMER 3=COUNTER',
    `theme_color` VARCHAR(20) DEFAULT '#4CAF50',
    `icon` VARCHAR(50) DEFAULT '跑步',
    `plan_content` TEXT,
    `coach_type` VARCHAR(50) DEFAULT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '0=ABANDONED 1=ACTIVE 2=COMPLETED',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `plan_daily_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `plan_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `record_date` DATE NOT NULL,
    `is_completed` TINYINT(1) NOT NULL DEFAULT 0,
    `actual_value` DECIMAL(10,2) DEFAULT NULL,
    `target_value` DECIMAL(10,2) DEFAULT NULL,
    `notes` VARCHAR(500) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_plan_id` (`plan_id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_record_date` (`record_date`),
    UNIQUE INDEX `uk_plan_date` (`plan_id`, `record_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `health_daily_record` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `record_date` DATE NOT NULL,
    `current_weight` DECIMAL(5,2) DEFAULT NULL,
    `calories_intake` INT DEFAULT NULL COMMENT '摄入卡路里',
    `calories_burned` INT DEFAULT NULL COMMENT '消耗卡路里',
    `sleep_hours` DECIMAL(3,1) DEFAULT NULL COMMENT '睡眠时长',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `uk_user_date` (`user_id`, `record_date`),
    INDEX `idx_health_user_date` (`user_id`, `record_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_daily_journal` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `record_date` DATE NOT NULL,
    `diary_text` TEXT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `uk_user_date` (`user_id`, `record_date`),
    INDEX `idx_user_date` (`user_id`, `record_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
