package com.selfpline.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RegisterRequest {

    @NotBlank(message = "用户名不能为空")
    private String username;

    @NotBlank(message = "密码不能为空")
    private String password;

    private BigDecimal height;
    private BigDecimal weight;
    private String healthGoal;
    private String medicalHistory;
}
