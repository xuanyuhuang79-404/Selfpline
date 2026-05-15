package com.selfpline.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("ai_coach_config")
public class AiCoachConfig {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String coachKey;
    private String coachName;
    private String coachAvatar;
    private String coachDescription;
    private String systemPrompt;
    private String tags;
    private Boolean isActive;
    private Integer sortOrder;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
