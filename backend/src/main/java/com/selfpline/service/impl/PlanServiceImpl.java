package com.selfpline.service.impl;

import com.selfpline.dao.AiCustomPlanMapper;
import com.selfpline.dao.PlanDailyLogMapper;
import com.selfpline.model.dto.request.DailyLogRequest;
import com.selfpline.model.dto.response.PlanCardResponse;
import com.selfpline.model.dto.response.PlanDetailResponse;
import com.selfpline.model.dto.response.PlanDetailResponse.DailyLogItem;
import com.selfpline.model.entity.AiCustomPlan;
import com.selfpline.model.entity.PlanDailyLog;
import com.selfpline.model.enums.PlanDirection;
import com.selfpline.model.enums.TrackingMode;
import com.selfpline.service.PlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlanServiceImpl implements PlanService {

    private final AiCustomPlanMapper planMapper;
    private final PlanDailyLogMapper dailyLogMapper;

    @Override
    public List<PlanCardResponse> getDashboard(Long userId) {
        List<AiCustomPlan> activePlans = planMapper.findActivePlansByUserId(userId);
        if (activePlans == null || activePlans.isEmpty()) {
            return List.of();
        }

        LocalDate today = LocalDate.now();
        List<PlanCardResponse> cards = new ArrayList<>();

        for (AiCustomPlan plan : activePlans) {
            Long planId = plan.getId();

            // todayCompleted: check if today's log exists and is completed
            PlanDailyLog todayLog = dailyLogMapper.findByPlanIdAndDate(planId, today);
            Boolean todayCompleted = todayLog != null && Boolean.TRUE.equals(todayLog.getIsCompleted());

            // streakDays: consecutive completed days counting backwards from today
            int streakDays = calculateStreakDays(planId, today);

            // progressPercent: completedDays / totalDays * 100
            double progressPercent = calculateProgressPercent(planId, plan.getStartDate(), today);

            PlanCardResponse card = PlanCardResponse.builder()
                    .planId(planId)
                    .planDirection(plan.getPlanDirection() != null ? plan.getPlanDirection().getCode() : null)
                    .targetName(plan.getTargetName())
                    .shortName(resolveShortName(plan.getShortName(), plan.getTargetName()))
                    .trackingMode(TrackingMode.CHECKBOX.getCode())
                    .themeColor(plan.getThemeColor())
                    .icon(plan.getIcon())
                    .streakDays(streakDays)
                    .todayCompleted(todayCompleted)
                    .progressPercent(progressPercent)
                    .build();
            cards.add(card);
        }

        return cards;
    }

    @Override
    public PlanDetailResponse getPlanDetail(Long planId, Long userId) {
        AiCustomPlan plan = planMapper.selectById(planId);
        if (plan == null || !plan.getUserId().equals(userId)) {
            throw new IllegalArgumentException("计划不存在");
        }

        LocalDate today = LocalDate.now();

        // query last 30 days of logs
        List<PlanDailyLog> dailyLogs = dailyLogMapper.findByPlanIdAndDateRange(
                planId, today.minusDays(30), today);

        // streakDays: consecutive completed days counting backwards from today
        int streakDays = calculateStreakDays(planId, today);

        // todayCompleted
        PlanDailyLog todayLog = dailyLogMapper.findByPlanIdAndDate(planId, today);
        Boolean todayCompleted = todayLog != null && Boolean.TRUE.equals(todayLog.getIsCompleted());

        // completionRate
        double completionRate = calculateProgressPercent(planId, plan.getStartDate(), today);

        // build DailyLogItem list from entity list
        List<DailyLogItem> logItems = dailyLogs.stream()
                .map(log -> DailyLogItem.builder()
                        .recordDate(log.getRecordDate() != null ? log.getRecordDate().toString() : null)
                        .isCompleted(log.getIsCompleted())
                        .actualValue(log.getActualValue() != null ? log.getActualValue().doubleValue() : null)
                        .targetValue(log.getTargetValue() != null ? log.getTargetValue().doubleValue() : null)
                        .notes(log.getNotes())
                        .build())
                .collect(Collectors.toList());

        return PlanDetailResponse.builder()
                .planId(plan.getId())
                .planDirection(plan.getPlanDirection() != null ? plan.getPlanDirection().getCode() : null)
                .targetName(plan.getTargetName())
                .shortName(resolveShortName(plan.getShortName(), plan.getTargetName()))
                .trackingMode(TrackingMode.CHECKBOX.getCode())
                .themeColor(plan.getThemeColor())
                .icon(plan.getIcon())
                .planContent(plan.getPlanContent())
                .coachType(plan.getCoachType())
                .streakDays(streakDays)
                .todayCompleted(todayCompleted)
                .completionRate(completionRate)
                .recentLogs(logItems)
                .build();
    }

    @Override
    public void submitDailyLog(Long userId, DailyLogRequest request) {
        AiCustomPlan plan = planMapper.selectById(request.getPlanId());
        if (plan == null || !userId.equals(plan.getUserId())) {
            throw new IllegalArgumentException("计划不存在");
        }

        LocalDate today = LocalDate.now();
        boolean completed = Boolean.TRUE.equals(request.getIsCompleted());
        BigDecimal actualValue = completed ? BigDecimal.ONE : BigDecimal.ZERO;

        PlanDailyLog existingLog = dailyLogMapper.findByPlanIdAndDate(
                request.getPlanId(), today);

        if (existingLog != null) {
            // update existing log
            existingLog.setIsCompleted(completed);
            existingLog.setActualValue(actualValue);
            existingLog.setTargetValue(BigDecimal.ONE);
            existingLog.setNotes(request.getNotes());
            dailyLogMapper.updateById(existingLog);
        } else {
            // create new log
            PlanDailyLog newLog = new PlanDailyLog();
            newLog.setPlanId(request.getPlanId());
            newLog.setUserId(userId);
            newLog.setRecordDate(today);
            newLog.setIsCompleted(completed);
            newLog.setActualValue(actualValue);
            newLog.setTargetValue(BigDecimal.ONE);
            newLog.setNotes(request.getNotes());
            dailyLogMapper.insert(newLog);
        }
    }

    @Override
    public Long confirmPlan(Long userId, Map<String, Object> planData) {
        if (planData == null || planData.isEmpty()) {
            throw new IllegalArgumentException("计划数据不能为空");
        }

        AiCustomPlan plan = new AiCustomPlan();
        plan.setUserId(userId);

        // targetName
        String targetName = (String) planData.get("targetName");
        if (targetName == null || targetName.isBlank()) {
            throw new IllegalArgumentException("计划名称不能为空");
        }
        plan.setTargetName(targetName);
        plan.setShortName(resolveShortName(planData.get("shortName"), targetName));

        // 当前阶段统一使用 checkbox 打卡，避免首页和详情页记录模式不一致。
        plan.setTrackingMode(TrackingMode.CHECKBOX);

        // themeColor (default "#4CAF50")
        String themeColor = (String) planData.get("themeColor");
        plan.setThemeColor(themeColor != null ? themeColor : "#4CAF50");

        // icon (default "📋")
        String icon = (String) planData.get("icon");
        plan.setIcon(icon != null ? icon : "📋");

        // planContent
        plan.setPlanContent((String) planData.get("planContent"));

        // coachType
        plan.setCoachType((String) planData.get("coachType"));

        // startDate (String or LocalDate -> LocalDate)
        LocalDate startDate = parseLocalDate(planData.get("startDate"));
        plan.setStartDate(startDate != null ? startDate : LocalDate.now());

        // endDate (String or LocalDate -> LocalDate, nullable)
        plan.setEndDate(parseLocalDate(planData.get("endDate")));

        // planDirection: 1=BUILD, 2=QUIT, default BUILD
        Integer directionCode = toInteger(planData.get("planDirection"));
        if (directionCode != null && directionCode == 2) {
            plan.setPlanDirection(PlanDirection.QUIT);
        } else {
            plan.setPlanDirection(PlanDirection.BUILD);
        }

        // status = 1 (active)
        plan.setStatus(1);

        planMapper.insert(plan);
        return plan.getId();
    }

    @Override
    public List<DailyLogItem> getDailyLogs(Long planId, Long userId, LocalDate startDate, LocalDate endDate) {
        AiCustomPlan plan = planMapper.selectById(planId);
        if (plan == null || !plan.getUserId().equals(userId)) {
            throw new IllegalArgumentException("计划不存在");
        }
        LocalDate today = LocalDate.now();
        List<PlanDailyLog> logs = dailyLogMapper.findByPlanIdAndDateRange(planId, today, today);
        return logs.stream()
                .map(log -> DailyLogItem.builder()
                        .recordDate(log.getRecordDate() != null ? log.getRecordDate().toString() : null)
                        .isCompleted(log.getIsCompleted())
                        .actualValue(log.getActualValue() != null ? log.getActualValue().doubleValue() : null)
                        .targetValue(log.getTargetValue() != null ? log.getTargetValue().doubleValue() : null)
                        .notes(log.getNotes())
                        .build())
                .collect(Collectors.toList());
    }

    // ==================== private helper methods ====================

    /**
     * Calculate consecutive completed days counting backwards from today.
     * Queries last 60 days of logs and counts backwards from today
     * how many consecutive days have isCompleted = true.
     */
    private int calculateStreakDays(Long planId, LocalDate today) {
        List<PlanDailyLog> recentLogs = dailyLogMapper.findByPlanIdAndDateRange(
                planId, today.minusDays(60), today);

        // Build a set of dates that are completed
        Set<LocalDate> completedDates = new HashSet<>();
        for (PlanDailyLog log : recentLogs) {
            if (Boolean.TRUE.equals(log.getIsCompleted()) && log.getRecordDate() != null) {
                completedDates.add(log.getRecordDate());
            }
        }

        int streak = 0;
        LocalDate cursor = today;
        while (completedDates.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }

    /**
     * Calculate completion rate as a percentage (0-100).
     * Formula: countCompletedDays(planId) / totalDays from startDate to today * 100.
     * Returns 0 if startDate is null or after today.
     */
    private double calculateProgressPercent(Long planId, LocalDate startDate, LocalDate today) {
        if (startDate == null || startDate.isAfter(today)) {
            return 0.0;
        }

        long totalDays = ChronoUnit.DAYS.between(startDate, today) + 1;
        int completedDays = dailyLogMapper.countCompletedDays(planId);

        if (totalDays <= 0) {
            return 0.0;
        }

        double percent = (double) completedDays / totalDays * 100.0;
        // round to 2 decimal places
        return Math.round(percent * 100.0) / 100.0;
    }

    private String resolveShortName(Object shortName, String targetName) {
        String rawShortName = shortName instanceof String text ? text : null;
        String value = rawShortName != null && !rawShortName.isBlank() ? rawShortName.trim() : targetName;
        if (value == null || value.isBlank()) {
            return "未命名计划";
        }
        String normalized = value.trim();
        return normalized.length() > 40 ? normalized.substring(0, 40) : normalized;
    }

    /**
     * Safely convert a map value to Integer, handling null and Number types.
     */
    private Integer toInteger(Object value) {
        if (value == null) return null;
        if (value instanceof Integer i) return i;
        if (value instanceof Number n) return n.intValue();
        return null;
    }

    /**
     * Parse a map value to LocalDate.
     * Handles LocalDate instances directly, or String in ISO format (yyyy-MM-dd).
     */
    private LocalDate parseLocalDate(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDate ld) return ld;
        if (value instanceof String s && !s.isBlank()) return LocalDate.parse(s);
        return null;
    }
}
