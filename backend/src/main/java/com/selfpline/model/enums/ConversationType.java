package com.selfpline.model.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import lombok.Getter;

@Getter
public enum ConversationType {
    PLAN_CREATION(1, "计划创建引导"),
    DAILY_ASSIST(2, "每日习惯辅助"),
    INDEPENDENT_CONSULT(3, "独立咨询");

    @EnumValue
    private final int code;
    private final String label;

    ConversationType(int code, String label) {
        this.code = code;
        this.label = label;
    }
}
