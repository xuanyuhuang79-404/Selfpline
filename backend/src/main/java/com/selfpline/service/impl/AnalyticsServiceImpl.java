package com.selfpline.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.selfpline.dao.AiCustomPlanMapper;
import com.selfpline.dao.CommunityPostMapper;
import com.selfpline.dao.HealthDailyRecordMapper;
import com.selfpline.dao.PlanDailyLogMapper;
import com.selfpline.model.entity.AiCustomPlan;
import com.selfpline.model.entity.CommunityPost;
import com.selfpline.model.entity.HealthDailyRecord;
import com.selfpline.model.entity.PlanDailyLog;
import com.selfpline.model.enums.PlanDirection;
import com.selfpline.model.enums.PlanStatus;
import com.selfpline.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsServiceImpl implements AnalyticsService {

    private final AiCustomPlanMapper planMapper;
    private final PlanDailyLogMapper dailyLogMapper;
    private final HealthDailyRecordMapper healthRecordMapper;
    private final CommunityPostMapper communityPostMapper;

    @Override
    public Map<String, Object> getOverview(Long userId, Integer days) {
        int safeDays = days == null ? 30 : Math.min(Math.max(days, 7), 180);
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(safeDays - 1L);

        List<AiCustomPlan> plans = planMapper.selectList(new LambdaQueryWrapper<AiCustomPlan>()
                .eq(AiCustomPlan::getUserId, userId)
                .ne(AiCustomPlan::getStatus, PlanStatus.ABANDONED.getCode())
                .orderByDesc(AiCustomPlan::getCreatedAt));
        List<PlanDailyLog> logs = dailyLogMapper.findByUserIdAndDateRange(userId, startDate, endDate);
        List<HealthDailyRecord> healthRecords = healthRecordMapper.findByUserIdAndDateRange(userId, startDate, endDate);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("range", Map.of("startDate", startDate.toString(), "endDate", endDate.toString(), "days", safeDays));
        result.put("summary", buildSummary(plans, logs, endDate));
        result.put("planTrend", buildPlanTrend(logs, startDate, endDate));
        result.put("healthTrend", buildHealthTrend(healthRecords));
        result.put("community", buildCommunitySummary(userId));
        return result;
    }

    private Map<String, Object> buildSummary(List<AiCustomPlan> plans, List<PlanDailyLog> logs, LocalDate today) {
        long activePlans = plans.stream().filter(plan -> Objects.equals(plan.getStatus(), PlanStatus.ACTIVE.getCode())).count();
        long archivedPlans = plans.stream().filter(plan -> Objects.equals(plan.getStatus(), PlanStatus.ARCHIVED.getCode())).count();
        long completedPlans = plans.stream().filter(plan -> Objects.equals(plan.getStatus(), PlanStatus.COMPLETED.getCode())).count();
        long buildPlans = plans.stream().filter(plan -> plan.getPlanDirection() == PlanDirection.BUILD).count();
        long quitPlans = plans.stream().filter(plan -> plan.getPlanDirection() == PlanDirection.QUIT).count();
        long todayDone = logs.stream()
                .filter(log -> today.equals(log.getRecordDate()))
                .filter(log -> Boolean.TRUE.equals(log.getIsCompleted()))
                .count();
        int todayTotal = (int) activePlans;
        int maxStreak = plans.stream()
                .mapToInt(plan -> calculateStreak(plan.getId(), logs, today))
                .max()
                .orElse(0);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalPlans", plans.size());
        summary.put("activePlans", activePlans);
        summary.put("archivedPlans", archivedPlans);
        summary.put("completedPlans", completedPlans);
        summary.put("buildPlans", buildPlans);
        summary.put("quitPlans", quitPlans);
        summary.put("todayDone", todayDone);
        summary.put("todayTotal", todayTotal);
        summary.put("todayRate", todayTotal == 0 ? 0 : Math.round((double) todayDone / todayTotal * 100));
        summary.put("maxStreak", maxStreak);
        return summary;
    }

    private Map<String, Object> buildPlanTrend(List<PlanDailyLog> logs, LocalDate startDate, LocalDate endDate) {
        Map<LocalDate, List<PlanDailyLog>> logsByDate = logs.stream()
                .filter(log -> log.getRecordDate() != null)
                .collect(Collectors.groupingBy(PlanDailyLog::getRecordDate));

        List<String> dates = new ArrayList<>();
        List<Integer> total = new ArrayList<>();
        List<Integer> completed = new ArrayList<>();
        List<Integer> rate = new ArrayList<>();

        LocalDate cursor = startDate;
        while (!cursor.isAfter(endDate)) {
            List<PlanDailyLog> dayLogs = logsByDate.getOrDefault(cursor, List.of());
            int dayTotal = dayLogs.size();
            int dayCompleted = (int) dayLogs.stream().filter(log -> Boolean.TRUE.equals(log.getIsCompleted())).count();
            dates.add(cursor.toString());
            total.add(dayTotal);
            completed.add(dayCompleted);
            rate.add(dayTotal == 0 ? 0 : (int) Math.round((double) dayCompleted / dayTotal * 100));
            cursor = cursor.plusDays(1);
        }

        Map<String, Object> trend = new LinkedHashMap<>();
        trend.put("dates", dates);
        trend.put("total", total);
        trend.put("completed", completed);
        trend.put("rate", rate);
        return trend;
    }

    private Map<String, Object> buildHealthTrend(List<HealthDailyRecord> records) {
        List<HealthDailyRecord> sorted = records.stream()
                .sorted(Comparator.comparing(HealthDailyRecord::getRecordDate))
                .collect(Collectors.toList());
        Map<String, Object> trend = new LinkedHashMap<>();
        trend.put("dates", sorted.stream().map(record -> record.getRecordDate().toString()).collect(Collectors.toList()));
        trend.put("weights", sorted.stream().map(HealthDailyRecord::getCurrentWeight).collect(Collectors.toList()));
        trend.put("sleepHours", sorted.stream().map(HealthDailyRecord::getSleepHours).collect(Collectors.toList()));
        trend.put("caloriesIn", sorted.stream().map(record -> record.getCaloriesIntake() != null ? record.getCaloriesIntake() : 0).collect(Collectors.toList()));
        trend.put("caloriesOut", sorted.stream().map(record -> record.getCaloriesBurned() != null ? record.getCaloriesBurned() : 0).collect(Collectors.toList()));
        return trend;
    }

    private Map<String, Object> buildCommunitySummary(Long userId) {
        Long totalPosts = communityPostMapper.selectCount(new LambdaQueryWrapper<>());
        Long myPosts = communityPostMapper.selectCount(new LambdaQueryWrapper<CommunityPost>().eq(CommunityPost::getUserId, userId));
        Map<String, Object> community = new LinkedHashMap<>();
        community.put("totalPosts", totalPosts != null ? totalPosts : 0);
        community.put("myPosts", myPosts != null ? myPosts : 0);
        return community;
    }

    private int calculateStreak(Long planId, List<PlanDailyLog> logs, LocalDate today) {
        Set<LocalDate> completedDates = logs.stream()
                .filter(log -> Objects.equals(log.getPlanId(), planId))
                .filter(log -> Boolean.TRUE.equals(log.getIsCompleted()))
                .map(PlanDailyLog::getRecordDate)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        int streak = 0;
        LocalDate cursor = today;
        while (completedDates.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }
}
