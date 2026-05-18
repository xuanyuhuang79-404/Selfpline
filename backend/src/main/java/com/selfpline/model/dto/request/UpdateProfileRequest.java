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

    @DecimalMin(value = "20.0", message = "体重范围20-300kg")
    @DecimalMax(value = "300.0", message = "体重范围20-300kg")
    private BigDecimal weight;

    @Size(max = 2000, message = "病史最多2000个字符")
    private String medicalHistory;
}
