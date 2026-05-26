package com.selfpline.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("plan_daily_log")
public class PlanDailyLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long planId;
    private Long userId;
    private LocalDate recordDate;
    private Boolean isCompleted;
    private BigDecimal actualValue;
    private BigDecimal targetValue;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
