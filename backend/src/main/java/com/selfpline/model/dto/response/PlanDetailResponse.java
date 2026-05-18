package com.selfpline.model.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PlanDetailResponse {

    private Long planId;
    private Integer planDirection;
    private String targetName;
    private String shortName;
    private Integer trackingMode;
    private String themeColor;
    private String icon;
    private String planContent;
    private String coachType;
    private Integer streakDays;
    private Boolean todayCompleted;
    private Double completionRate;
    private List<DailyLogItem> recentLogs;

    @Data
    @Builder
    public static class DailyLogItem {
        private String recordDate;
        private Boolean isCompleted;
        private Double actualValue;
        private Double targetValue;
        private String notes;
    }
}
