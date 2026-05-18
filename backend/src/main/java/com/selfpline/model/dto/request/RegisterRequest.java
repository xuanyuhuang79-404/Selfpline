package com.selfpline.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RegisterRequest {

    @NotBlank(message = "用户名不能为空")
    private String username;

    @NotBlank(message = "密码不能为空")
    private String password;

    @NotNull(message = "身高不能为空")
    @DecimalMin(value = "50.0", message = "身高范围50-250cm")
    @DecimalMax(value = "250.0", message = "身高范围50-250cm")
    private BigDecimal height;

    @NotNull(message = "体重不能为空")
    @DecimalMin(value = "20.0", message = "体重范围20-300kg")
    @DecimalMax(value = "300.0", message = "体重范围20-300kg")
    private BigDecimal weight;

    @NotBlank(message = "病史不能为空，可填写“无”")
    private String medicalHistory;
}
