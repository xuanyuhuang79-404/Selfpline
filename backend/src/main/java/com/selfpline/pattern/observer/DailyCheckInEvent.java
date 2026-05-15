package com.selfpline.pattern.observer;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class DailyCheckInEvent extends ApplicationEvent {

    private final Long userId;
    private final Long recordId;

    public DailyCheckInEvent(Object source, Long userId, Long recordId) {
        super(source);
        this.userId = userId;
        this.recordId = recordId;
    }
}
