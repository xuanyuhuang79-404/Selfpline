package com.selfpline.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.selfpline.model.enums.PlanDirection;
import com.selfpline.model.enums.TrackingMode;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("ai_custom_plan")
public class AiCustomPlan {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private PlanDirection planDirection;
    private String targetName;
    private TrackingMode trackingMode;
    private String themeColor;
    private String icon;
    private String planContent;
    private String coachType;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer status;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
