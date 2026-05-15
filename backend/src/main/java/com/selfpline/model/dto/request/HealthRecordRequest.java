package com.selfpline.model.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class HealthRecordRequest {

    @NotNull(message = "记录日期不能为空")
    private LocalDate recordDate;

    private BigDecimal currentWeight;
    private Integer caloriesIntake;
    private Integer caloriesBurned;
    private BigDecimal sleepHours;

    private List<Long> completedPlanIds;
}
