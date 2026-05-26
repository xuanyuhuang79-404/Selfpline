package com.selfpline.pattern.observer;

import com.selfpline.dao.AiCustomPlanMapper;
import com.selfpline.dao.PlanDailyLogMapper;
import com.selfpline.model.entity.AiCustomPlan;
import com.selfpline.model.entity.PlanDailyLog;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiPlanAdjustObserver {

    private final AiCustomPlanMapper planMapper;
    private final PlanDailyLogMapper dailyLogMapper;

    @EventListener
    public void onCheckIn(DailyCheckInEvent event) {
        List<AiCustomPlan> activePlans = planMapper.findActivePlansByUserId(event.getUserId());
        if (activePlans == null || activePlans.isEmpty()) {
            return;
        }
        LocalDate today = LocalDate.now();
        for (AiCustomPlan plan : activePlans) {
            List<PlanDailyLog> recentLogs = dailyLogMapper.findByPlanIdAndDateRange(
                    plan.getId(), today.minusDays(7), today);
            long completedCount = recentLogs.stream()
                    .filter(log -> Boolean.TRUE.equals(log.getIsCompleted()))
                    .count();
            int totalDays = Math.max(1, recentLogs.size());
            int completionRate = (int) (completedCount * 100 / totalDays);

            log.info("用户 {} 计划 {} AI评估完成，近7天完成率: {}%", event.getUserId(), plan.getId(), completionRate);
        }
    }
}
