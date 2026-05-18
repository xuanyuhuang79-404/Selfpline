package com.selfpline.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("health_daily_record")
public class HealthDailyRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private LocalDate recordDate;
    private BigDecimal currentWeight;
    private Integer caloriesIntake;
    private Integer caloriesBurned;
    private BigDecimal sleepHours;
    private Integer steps;
    private Integer exerciseMinutes;
    private Integer moodLevel;
    private Integer energyLevel;
    private Integer stressLevel;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
