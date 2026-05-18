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
}
