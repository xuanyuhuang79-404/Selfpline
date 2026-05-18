package com.selfpline.model.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PlanUpdateRequest {

    @Size(max = 100, message = "计划目标最多100个字符")
    private String targetName;

    @Size(max = 40, message = "计划短名最多40个字符")
    private String shortName;

    private Integer planDirection;

    private String themeColor;

    @Size(max = 50, message = "计划图标最多50个字符")
    private String icon;

    private String planContent;

    private String coachType;

    private String startDate;

    private String endDate;

    private Integer status;
}
