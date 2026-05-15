package com.selfpline.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

@Data
public class PlanConfirmRequest {

    @NotBlank(message = "会话ID不能为空")
    private String sessionId;

    @NotNull(message = "计划数据不能为空")
    private Map<String, Object> planData;
}
