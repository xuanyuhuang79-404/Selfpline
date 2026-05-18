package com.selfpline.model.dto.request;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class DailyRecordRequest {

    private LocalDate recordDate;
    private BigDecimal currentWeight;
    private Integer caloriesIntake;
    private Integer caloriesBurned;
    private BigDecimal sleepHours;
    private Integer steps;
    private Integer exerciseMinutes;
    private Integer moodLevel;
    private Integer energyLevel;
    private Integer stressLevel;
    private String diaryText;
}
