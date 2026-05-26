package com.selfpline.model.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class DailyLogRequest {

    @NotNull(message = "计划ID不能为空")
    private Long planId;

    private LocalDate recordDate;

    @NotNull(message = "完成状态不能为空")
    private Boolean isCompleted;

    private BigDecimal actualValue;
    private BigDecimal targetValue;
}
