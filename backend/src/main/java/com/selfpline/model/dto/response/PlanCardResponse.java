package com.selfpline.model.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PlanCardResponse {

    private Long planId;
    private Integer planDirection;
    private String targetName;
    private String shortName;
    private Integer trackingMode;
    private String themeColor;
    private String icon;
    private Integer streakDays;
    private Boolean todayCompleted;
    private Double progressPercent;
}
