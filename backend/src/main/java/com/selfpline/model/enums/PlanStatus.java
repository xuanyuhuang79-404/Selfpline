package com.selfpline.model.enums;

import lombok.Getter;

@Getter
public enum PlanStatus {
    ABANDONED(0, "废弃"),
    ACTIVE(1, "执行中"),
    COMPLETED(2, "已完成");

    private final int code;
    private final String label;

    PlanStatus(int code, String label) {
        this.code = code;
        this.label = label;
    }
}
