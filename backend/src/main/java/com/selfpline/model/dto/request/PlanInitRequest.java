package com.selfpline.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PlanInitRequest {

    @NotBlank(message = "计划方向不能为空")
    private String direction;   // BUILD / QUIT

    @NotBlank(message = "计划主题不能为空")
    private String topic;

    private String coachType;

    private String sceneKey;
}
