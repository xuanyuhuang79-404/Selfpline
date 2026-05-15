package com.selfpline.model.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import lombok.Getter;

@Getter
public enum TrackingMode {
    CHECKBOX(1, "复选框打卡"),
    TIMER(2, "倒计时器"),
    COUNTER(3, "限额计数器");

    @EnumValue
    private final int code;
    private final String label;

    TrackingMode(int code, String label) {
        this.code = code;
        this.label = label;
    }
}
