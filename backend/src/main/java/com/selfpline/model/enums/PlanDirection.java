package com.selfpline.model.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import lombok.Getter;

@Getter
public enum PlanDirection {
    BUILD(1, "养成习惯"),
    QUIT(2, "戒除习惯");

    @EnumValue
    private final int code;
    private final String label;

    PlanDirection(int code, String label) {
        this.code = code;
        this.label = label;
    }
}
