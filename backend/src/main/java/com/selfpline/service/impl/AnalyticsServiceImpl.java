package com.selfpline.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.selfpline.dao.AiCustomPlanMapper;
import com.selfpline.dao.CommunityPostMapper;
import com.selfpline.dao.HealthDailyRecordMapper;
import com.selfpline.dao.PlanDailyLogMapper;
import com.selfpline.dao.SysUserMapper;
import com.selfpline.model.entity.AiCustomPlan;
import com.selfpline.model.entity.CommunityPost;
import com.selfpline.model.entity.HealthDailyRecord;
import com.selfpline.model.entity.PlanDailyLog;
import com.selfpline.model.entity.SysUser;
import com.selfpline.model.enums.PlanDirection;
import com.selfpline.model.enums.PlanStatus;
import com.selfpline.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
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
    private final SysUserMapper userMapper;

    @Override
    public Map<String, Object> getOverview(Long userId, Integer days) {
        int safeDays = days == null ? 30 : Math.min(Math.max(days, 7), 180);
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(safeDays - 1L);

        List<AiCustomPlan> plans = planMapper.selectList(new LambdaQueryWrapper<AiCustomPlan>()
                .eq(AiCustomPlan::getUserId, userId)
                .ne(AiCustomPlan::getStatus, PlanStatus.ABANDONED.getCode())
                .orderByDesc(AiCustomPlan::getCreatedAt));
        Set<Long> validPlanIds = plans.stream()
                .map(AiCustomPlan::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        List<PlanDailyLog> logs = dailyLogMapper.findByUserIdAndDateRange(userId, startDate, endDate).stream()
                .filter(log -> validPlanIds.contains(log.getPlanId()))
                .collect(Collectors.toList());
        List<HealthDailyRecord> healthRecords = healthRecordMapper.findByUserIdAndDateRange(userId, startDate, endDate);
        HealthDailyRecord latestWeightRecord = healthRecordMapper.findLatestWithWeightByUserId(userId);
        SysUser user = userMapper.selectById(userId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("range", Map.of("startDate", startDate.toString(), "endDate", endDate.toString(), "days", safeDays));
        result.put("summary", buildSummary(plans, logs, endDate));
        result.put("planTrend", buildPlanTrend(logs, startDate, endDate));
        result.put("healthTrend", buildHealthTrend(healthRecords));
        result.put("healthSummary", buildHealthSummary(user, healthRecords, latestWeightRecord));
        result.put("todayRecord", buildTodayRecord(healthRecords, endDate));
        result.put("recentRecords", buildRecentRecords(healthRecords));
        result.put("community", buildCommunitySummary(userId));
        return result;
    }

    private Map<String, Object> buildSummary(List<AiCustomPlan> plans, List<PlanDailyLog> logs, LocalDate today) {
        long activePlans = plans.stream().filter(plan -> Objects.equals(plan.getStatus(), PlanStatus.ACTIVE.getCode())).count();
        long archivedPlans = plans.stream().filter(plan -> Objects.equals(plan.getStatus(), PlanStatus.ARCHIVED.getCode())).count();
        long completedPlans = plans.stream().filter(plan -> Objects.equals(plan.getStatus(), PlanStatus.COMPLETED.getCode())).count();
        long buildPlans = plans.stream().filter(plan -> plan.getPlanDirection() == PlanDirection.BUILD).count();
        long quitPlans = plans.stream().filter(plan -> plan.getPlanDirection() == PlanDirection.QUIT).count();
        Set<Long> activePlanIds = plans.stream()
                .filter(plan -> Objects.equals(plan.getStatus(), PlanStatus.ACTIVE.getCode()))
                .map(AiCustomPlan::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        long todayDone = logs.stream()
                .filter(log -> today.equals(log.getRecordDate()))
                .filter(log -> Boolean.TRUE.equals(log.getIsCompleted()))
                .filter(log -> activePlanIds.contains(log.getPlanId()))
                .map(PlanDailyLog::getPlanId)
                .distinct()
                .count();
        int todayTotal = (int) activePlans;
        todayDone = Math.min(todayDone, todayTotal);
        int maxStreak = plans.stream()
                .mapToInt(plan -> calculateStreak(plan.getId(), logs, today))
                .max()
                .orElse(0);
        LocalDate reviewStartDate = today.minusDays(2);
        long reviewPlans = activePlanIds.stream()
                .filter(planId -> logs.stream().noneMatch(log ->
                        Objects.equals(log.getPlanId(), planId)
                                && Boolean.TRUE.equals(log.getIsCompleted())
                                && log.getRecordDate() != null
                                && !log.getRecordDate().isBefore(reviewStartDate)))
                .count();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalPlans", plans.size());
        summary.put("activePlans", activePlans);
        summary.put("archivedPlans", archivedPlans);
        summary.put("completedPlans", completedPlans);
        summary.put("endedPlans", archivedPlans);
        summary.put("reviewPlans", reviewPlans);
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
            Map<Long, Boolean> dayPlanStatus = new LinkedHashMap<>();
            for (PlanDailyLog log : dayLogs) {
                if (log.getPlanId() == null) {
                    continue;
                }
                boolean completedLog = Boolean.TRUE.equals(log.getIsCompleted());
                dayPlanStatus.merge(log.getPlanId(), completedLog, (left, right) -> left || right);
            }
            int dayTotal = dayPlanStatus.size();
            int dayCompleted = (int) dayPlanStatus.values().stream().filter(Boolean.TRUE::equals).count();
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
        trend.put("netCalories", sorted.stream().map(record -> (record.getCaloriesIntake() != null ? record.getCaloriesIntake() : 0)
                - (record.getCaloriesBurned() != null ? record.getCaloriesBurned() : 0)).collect(Collectors.toList()));
        trend.put("steps", sorted.stream().map(record -> record.getSteps() != null ? record.getSteps() : 0).collect(Collectors.toList()));
        trend.put("exerciseMinutes", sorted.stream().map(record -> record.getExerciseMinutes() != null ? record.getExerciseMinutes() : 0).collect(Collectors.toList()));
        trend.put("moodLevels", sorted.stream().map(HealthDailyRecord::getMoodLevel).collect(Collectors.toList()));
        trend.put("energyLevels", sorted.stream().map(HealthDailyRecord::getEnergyLevel).collect(Collectors.toList()));
        trend.put("stressLevels", sorted.stream().map(HealthDailyRecord::getStressLevel).collect(Collectors.toList()));
        return trend;
    }

    private Map<String, Object> buildHealthSummary(SysUser user, List<HealthDailyRecord> records, HealthDailyRecord latestWeightRecord) {
        List<HealthDailyRecord> sorted = records.stream()
                .sorted(Comparator.comparing(HealthDailyRecord::getRecordDate))
                .collect(Collectors.toList());
        BigDecimal latestWeight = latestWeightRecord != null && latestWeightRecord.getCurrentWeight() != null
                ? latestWeightRecord.getCurrentWeight()
                : (user != null ? user.getWeight() : null);
        Double bmi = calculateBmi(user != null ? user.getHeight() : null, latestWeight);
        double avgMood = averageLevel(sorted.stream().map(HealthDailyRecord::getMoodLevel).collect(Collectors.toList()));
        double avgEnergy = averageLevel(sorted.stream().map(HealthDailyRecord::getEnergyLevel).collect(Collectors.toList()));
        double avgStress = averageLevel(sorted.stream().map(HealthDailyRecord::getStressLevel).collect(Collectors.toList()));

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("bmi", bmi);
        summary.put("bmiLabel", describeBmi(bmi));
        summary.put("avgSteps", Math.round(sorted.stream()
                .map(HealthDailyRecord::getSteps)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0)));
        summary.put("avgExerciseMinutes", Math.round(sorted.stream()
                .map(HealthDailyRecord::getExerciseMinutes)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0)));
        summary.put("avgMoodLevel", avgMood);
        summary.put("avgEnergyLevel", avgEnergy);
        summary.put("avgStressLevel", avgStress);
        summary.put("moodLabel", describePositiveLevel(avgMood, "暂无", "偏低", "平稳", "不错"));
        summary.put("energyLabel", describePositiveLevel(avgEnergy, "暂无", "偏低", "尚可", "充足"));
        summary.put("stressLabel", describeStress(avgStress));
        summary.put("recordCount", sorted.size());
        summary.put("latestWeight", latestWeight);
        return summary;
    }

    private Map<String, Object> buildTodayRecord(List<HealthDailyRecord> records, LocalDate today) {
        return records.stream()
                .filter(record -> today.equals(record.getRecordDate()))
                .findFirst()
                .map(record -> {
                    Map<String, Object> data = toRecordMap(record);
                    data.put("healthRecordExists", true);
                    return data;
                })
                .orElseGet(() -> {
                    Map<String, Object> data = new LinkedHashMap<>();
                    data.put("recordDate", today.toString());
                    data.put("healthRecordExists", false);
                    return data;
                });
    }

    private List<Map<String, Object>> buildRecentRecords(List<HealthDailyRecord> records) {
        return records.stream()
                .sorted(Comparator.comparing(HealthDailyRecord::getRecordDate).reversed())
                .limit(3)
                .map(this::toRecordMap)
                .collect(Collectors.toList());
    }

    private Map<String, Object> toRecordMap(HealthDailyRecord record) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("recordDate", record.getRecordDate() != null ? record.getRecordDate().toString() : null);
        data.put("currentWeight", record.getCurrentWeight());
        data.put("caloriesIntake", record.getCaloriesIntake());
        data.put("caloriesBurned", record.getCaloriesBurned());
        data.put("sleepHours", record.getSleepHours());
        data.put("steps", record.getSteps());
        data.put("exerciseMinutes", record.getExerciseMinutes());
        data.put("moodLevel", record.getMoodLevel());
        data.put("energyLevel", record.getEnergyLevel());
        data.put("stressLevel", record.getStressLevel());
        return data;
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

    private Double calculateBmi(BigDecimal heightCm, BigDecimal weightKg) {
        if (heightCm == null || weightKg == null || heightCm.doubleValue() <= 0 || weightKg.doubleValue() <= 0) {
            return null;
        }
        double heightMeter = heightCm.doubleValue() / 100.0;
        double bmi = weightKg.doubleValue() / (heightMeter * heightMeter);
        return Math.round(bmi * 10.0) / 10.0;
    }

    private String describeBmi(Double bmi) {
        if (bmi == null) {
            return "暂无";
        }
        if (bmi < 18.5) {
            return "偏低";
        }
        if (bmi < 24) {
            return "标准";
        }
        if (bmi < 28) {
            return "偏高";
        }
        return "较高";
    }

    private double averageLevel(List<Integer> values) {
        return Math.round(values.stream()
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0) * 10.0) / 10.0;
    }

    private String describePositiveLevel(double value, String empty, String low, String mid, String high) {
        if (value <= 0) {
            return empty;
        }
        if (value < 2.6) {
            return low;
        }
        if (value < 4.1) {
            return mid;
        }
        return high;
    }

    private String describeStress(double value) {
        if (value <= 0) {
            return "暂无";
        }
        if (value < 2.3) {
            return "较低";
        }
        if (value < 3.8) {
            return "可控";
        }
        return "偏高";
    }
}
