package com.selfpline.model.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateProfileRequest {

    @DecimalMin(value = "50.0", message = "身高范围50-250cm")
    @DecimalMax(value = "250.0", message = "身高范围50-250cm")
    private BigDecimal height;

    @Size(max = 100, message = "健康目标最多100个字符")
    private String healthGoal;

    @Size(max = 2000, message = "病史最多2000个字符")
    private String medicalHistory;

    @Size(max = 2000, message = "AI个性化提示词最多2000个字符")
    private String aiPreferencePrompt;
}
