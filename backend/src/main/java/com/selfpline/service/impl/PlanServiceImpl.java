package com.selfpline.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.selfpline.dao.AiCustomPlanMapper;
import com.selfpline.dao.PlanDailyLogMapper;
import com.selfpline.model.dto.request.DailyLogRequest;
import com.selfpline.model.dto.request.PlanUpdateRequest;
import com.selfpline.model.dto.response.PlanCardResponse;
import com.selfpline.model.dto.response.PlanDetailResponse;
import com.selfpline.model.dto.response.PlanDetailResponse.DailyLogItem;
import com.selfpline.model.entity.AiCustomPlan;
import com.selfpline.model.entity.PlanDailyLog;
import com.selfpline.model.enums.PlanDirection;
import com.selfpline.model.enums.PlanStatus;
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
            cards.add(toPlanCard(plan, today));
        }

        return cards;
    }

    @Override
    public List<PlanCardResponse> listPlans(Long userId, Integer status, Integer direction, String keyword) {
        LambdaQueryWrapper<AiCustomPlan> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiCustomPlan::getUserId, userId);
        if (status != null) {
            wrapper.eq(AiCustomPlan::getStatus, status);
        } else {
            wrapper.ne(AiCustomPlan::getStatus, PlanStatus.ABANDONED.getCode());
        }
        PlanDirection planDirection = parsePlanDirection(direction);
        if (planDirection != null) {
            wrapper.eq(AiCustomPlan::getPlanDirection, planDirection);
        }
        if (keyword != null && !keyword.isBlank()) {
            String normalizedKeyword = keyword.trim();
            wrapper.and(q -> q.like(AiCustomPlan::getTargetName, normalizedKeyword)
                    .or()
                    .like(AiCustomPlan::getShortName, normalizedKeyword));
        }
        wrapper.orderByDesc(AiCustomPlan::getCreatedAt);

        LocalDate today = LocalDate.now();
        return planMapper.selectList(wrapper).stream()
                .map(plan -> toPlanCard(plan, today))
                .collect(Collectors.toList());
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
    public void updatePlan(Long planId, Long userId, PlanUpdateRequest request) {
        AiCustomPlan plan = getOwnedPlan(planId, userId);
        if (request == null) {
            return;
        }
        if (request.getTargetName() != null) {
            String targetName = request.getTargetName().trim();
            if (targetName.isBlank()) {
                throw new IllegalArgumentException("计划目标不能为空");
            }
            plan.setTargetName(targetName);
        }
        if (request.getShortName() != null) {
            plan.setShortName(resolveShortName(request.getShortName(), plan.getTargetName()));
        }
        PlanDirection direction = parsePlanDirection(request.getPlanDirection());
        if (direction != null) {
            plan.setPlanDirection(direction);
        }
        if (request.getThemeColor() != null) {
            plan.setThemeColor(normalizeColor(request.getThemeColor(), plan.getThemeColor()));
        }
        if (request.getIcon() != null) {
            plan.setIcon(request.getIcon().isBlank() ? "📋" : request.getIcon().trim());
        }
        if (request.getPlanContent() != null) {
            plan.setPlanContent(request.getPlanContent());
        }
        if (request.getCoachType() != null) {
            plan.setCoachType(request.getCoachType().isBlank() ? null : request.getCoachType().trim());
        }
        LocalDate startDate = parseLocalDate(request.getStartDate());
        if (startDate != null) {
            plan.setStartDate(startDate);
        }
        LocalDate endDate = parseLocalDate(request.getEndDate());
        if (endDate != null) {
            plan.setEndDate(endDate);
        }
        if (request.getStatus() != null) {
            plan.setStatus(normalizeStatus(request.getStatus()));
        }
        planMapper.updateById(plan);
    }

    @Override
    public void archivePlan(Long planId, Long userId) {
        updateStatus(planId, userId, PlanStatus.ARCHIVED.getCode());
    }

    @Override
    public void restorePlan(Long planId, Long userId) {
        updateStatus(planId, userId, PlanStatus.ACTIVE.getCode());
    }

    @Override
    public void deletePlan(Long planId, Long userId) {
        AiCustomPlan plan = getOwnedPlan(planId, userId);
        dailyLogMapper.delete(new LambdaQueryWrapper<PlanDailyLog>()
                .eq(PlanDailyLog::getPlanId, plan.getId())
                .eq(PlanDailyLog::getUserId, userId));
        planMapper.deleteById(plan.getId());
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
        LocalDate[] range = normalizeDateRange(startDate, endDate, 366);
        List<PlanDailyLog> logs = dailyLogMapper.findByPlanIdAndDateRange(planId, range[0], range[1]);
        return logs.stream()
                .map(log -> DailyLogItem.builder()
                        .recordDate(log.getRecordDate() != null ? log.getRecordDate().toString() : null)
                        .isCompleted(log.getIsCompleted())
                        .actualValue(log.getActualValue() != null ? log.getActualValue().doubleValue() : null)
                        .targetValue(log.getTargetValue() != null ? log.getTargetValue().doubleValue() : null)
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

    private PlanCardResponse toPlanCard(AiCustomPlan plan, LocalDate today) {
        Long planId = plan.getId();
        PlanDailyLog todayLog = dailyLogMapper.findByPlanIdAndDate(planId, today);
        Boolean todayCompleted = todayLog != null && Boolean.TRUE.equals(todayLog.getIsCompleted());
        int streakDays = calculateStreakDays(planId, today);
        double progressPercent = calculateProgressPercent(planId, plan.getStartDate(), today);
        int completedDays = dailyLogMapper.countCompletedDays(planId);

        return PlanCardResponse.builder()
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
                .status(plan.getStatus())
                .startDate(plan.getStartDate() != null ? plan.getStartDate().toString() : null)
                .endDate(plan.getEndDate() != null ? plan.getEndDate().toString() : null)
                .completedDays(completedDays)
                .build();
    }

    private AiCustomPlan getOwnedPlan(Long planId, Long userId) {
        AiCustomPlan plan = planMapper.selectById(planId);
        if (plan == null || !userId.equals(plan.getUserId())) {
            throw new IllegalArgumentException("计划不存在");
        }
        return plan;
    }

    private void updateStatus(Long planId, Long userId, int status) {
        AiCustomPlan plan = getOwnedPlan(planId, userId);
        plan.setStatus(status);
        planMapper.updateById(plan);
    }

    private LocalDate[] normalizeDateRange(LocalDate startDate, LocalDate endDate, int maxDays) {
        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end;
        if (start.isAfter(end)) {
            LocalDate tmp = start;
            start = end;
            end = tmp;
        }
        int safeMaxDays = Math.max(maxDays, 1);
        if (start.plusDays(safeMaxDays - 1L).isBefore(end)) {
            start = end.minusDays(safeMaxDays - 1L);
        }
        return new LocalDate[]{start, end};
    }

    private PlanDirection parsePlanDirection(Integer directionCode) {
        if (directionCode == null) {
            return null;
        }
        if (directionCode == PlanDirection.QUIT.getCode()) {
            return PlanDirection.QUIT;
        }
        if (directionCode == PlanDirection.BUILD.getCode()) {
            return PlanDirection.BUILD;
        }
        throw new IllegalArgumentException("计划方向不合法");
    }

    private int normalizeStatus(Integer status) {
        if (status == null) {
            return PlanStatus.ACTIVE.getCode();
        }
        for (PlanStatus planStatus : PlanStatus.values()) {
            if (planStatus.getCode() == status) {
                return status;
            }
        }
        throw new IllegalArgumentException("计划状态不合法");
    }

    private String normalizeColor(String color, String fallback) {
        String value = color != null ? color.trim() : "";
        if (value.matches("^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")) {
            return value;
        }
        return fallback != null ? fallback : "#4CAF50";
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

        int safeCompletedDays = (int) Math.min(completedDays, totalDays);
        double percent = (double) safeCompletedDays / totalDays * 100.0;
        // round to 2 decimal places
        return Math.min(100.0, Math.round(percent * 100.0) / 100.0);
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
