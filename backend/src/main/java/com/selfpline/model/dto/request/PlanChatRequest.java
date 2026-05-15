package com.selfpline.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PlanChatRequest {

    @NotBlank(message = "会话ID不能为空")
    private String sessionId;

    @NotBlank(message = "消息不能为空")
    private String message;

    private String coachType;

    private String sceneKey;
}
