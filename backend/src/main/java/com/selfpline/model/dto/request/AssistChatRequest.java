package com.selfpline.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssistChatRequest {

    @NotNull(message = "计划ID不能为空")
    private Long planId;

    @NotBlank(message = "消息不能为空")
    private String message;

    private String sceneKey;
}
