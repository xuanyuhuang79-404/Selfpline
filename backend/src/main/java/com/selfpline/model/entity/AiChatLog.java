package com.selfpline.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.selfpline.model.enums.ConversationType;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("ai_chat_log")
public class AiChatLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private Long planId;
    private ConversationType conversationType;
    private String coachRole;
    private String userMessage;
    private String aiResponse;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
