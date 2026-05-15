package com.selfpline.pattern.observer;

import com.selfpline.dao.SysNotificationMapper;
import com.selfpline.model.entity.SysNotification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PointsObserver {

    private final SysNotificationMapper notificationMapper;

    @EventListener
    public void onCheckIn(DailyCheckInEvent event) {
        SysNotification notif = new SysNotification();
        notif.setUserId(event.getUserId());
        notif.setNotifyType(2);
        notif.setTitle("积分奖励");
        notif.setContent("今日健康打卡成功，获得10积分！继续加油！");
        notificationMapper.insert(notif);
        log.info("用户 {} 打卡成功，积分+10", event.getUserId());
    }
}
