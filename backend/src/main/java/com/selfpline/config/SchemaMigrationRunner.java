package com.selfpline.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SchemaMigrationRunner implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        ensureAiCustomPlanShortName();
        ensureHealthDailyRecordStateFields();
        ensureCommunityTables();
    }

    private void ensureAiCustomPlanShortName() {
        if (!tableExists("ai_custom_plan")) {
            log.warn("Skip schema migration: table ai_custom_plan does not exist");
            return;
        }
        if (columnExists("ai_custom_plan", "short_name")) {
            return;
        }
        jdbcTemplate.execute("""
                ALTER TABLE ai_custom_plan
                ADD COLUMN short_name VARCHAR(40) NULL COMMENT '计划短名/首页缩略指代'
                AFTER target_name
                """);
        log.info("Schema migration applied: ai_custom_plan.short_name");
    }

    private void ensureHealthDailyRecordStateFields() {
        if (!tableExists("health_daily_record")) {
            log.warn("Skip schema migration: table health_daily_record does not exist");
            return;
        }
        addColumnIfMissing("health_daily_record", "steps", """
                ALTER TABLE health_daily_record
                ADD COLUMN steps INT NULL COMMENT '步数'
                AFTER sleep_hours
                """);
        addColumnIfMissing("health_daily_record", "exercise_minutes", """
                ALTER TABLE health_daily_record
                ADD COLUMN exercise_minutes INT NULL COMMENT '锻炼时长(分钟)'
                AFTER steps
                """);
        addColumnIfMissing("health_daily_record", "mood_level", """
                ALTER TABLE health_daily_record
                ADD COLUMN mood_level TINYINT NULL COMMENT '心情状态 1-5'
                AFTER exercise_minutes
                """);
        addColumnIfMissing("health_daily_record", "energy_level", """
                ALTER TABLE health_daily_record
                ADD COLUMN energy_level TINYINT NULL COMMENT '精力状态 1-5'
                AFTER mood_level
                """);
        addColumnIfMissing("health_daily_record", "stress_level", """
                ALTER TABLE health_daily_record
                ADD COLUMN stress_level TINYINT NULL COMMENT '压力状态 1-5'
                AFTER energy_level
                """);
    }

    private void ensureCommunityTables() {
        if (!tableExists("community_post")) {
            jdbcTemplate.execute("""
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
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区动态'
                    """);
            log.info("Schema migration applied: community_post");
        }
        jdbcTemplate.execute("""
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
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区评论'
                """);
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS community_post_like (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    post_id BIGINT NOT NULL,
                    user_id BIGINT NOT NULL,
                    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY uk_post_user (post_id, user_id),
                    INDEX idx_user_id (user_id),
                    FOREIGN KEY (post_id) REFERENCES community_post(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES sys_user(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区点赞关系'
                """);
    }

    private boolean tableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = ?
                """, Integer.class, tableName);
        return count != null && count > 0;
    }

    private boolean columnExists(String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = ?
                  AND COLUMN_NAME = ?
                """, Integer.class, tableName, columnName);
        return count != null && count > 0;
    }

    private void addColumnIfMissing(String tableName, String columnName, String sql) {
        if (columnExists(tableName, columnName)) {
            return;
        }
        jdbcTemplate.execute(sql);
        log.info("Schema migration applied: {}.{}", tableName, columnName);
    }
}
