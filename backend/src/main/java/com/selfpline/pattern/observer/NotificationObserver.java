package com.selfpline.pattern.observer;

import com.selfpline.dao.SysNotificationMapper;
import com.selfpline.model.entity.SysNotification;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class NotificationObserver {

    private final SysNotificationMapper notificationMapper;

    @EventListener
    public void onCheckIn(DailyCheckInEvent event) {
        SysNotification notif = new SysNotification();
        notif.setUserId(event.getUserId());
        notif.setNotifyType(1);
        notif.setTitle("打卡成功");
        notif.setContent("今日健康打卡已记录，继续加油！");
        notificationMapper.insert(notif);
    }
}
