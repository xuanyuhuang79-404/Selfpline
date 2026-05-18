package com.selfpline.model.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class DailyRecordResponse {

    private LocalDate recordDate;
    private BigDecimal currentWeight;
    private Integer caloriesIntake;
    private Integer caloriesBurned;
    private BigDecimal sleepHours;
    private String diaryText;
    private Boolean healthRecordExists;
    private Boolean journalExists;
}
