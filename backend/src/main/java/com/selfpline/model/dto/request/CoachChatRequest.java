package com.selfpline.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CoachChatRequest {

    @NotBlank(message = "消息不能为空")
    private String message;

    private String sceneKey;
}
