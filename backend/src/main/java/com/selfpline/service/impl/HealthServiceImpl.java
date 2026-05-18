package com.selfpline.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.selfpline.dao.HealthDailyRecordMapper;
import com.selfpline.model.dto.request.HealthRecordRequest;
import com.selfpline.model.entity.HealthDailyRecord;
import com.selfpline.pattern.observer.DailyCheckInEvent;
import com.selfpline.service.HealthService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class HealthServiceImpl implements HealthService {

    private final HealthDailyRecordMapper healthRecordMapper;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public void submitDailyRecord(Long userId, HealthRecordRequest request) {
        LambdaQueryWrapper<HealthDailyRecord> queryWrapper = new LambdaQueryWrapper<HealthDailyRecord>()
                .eq(HealthDailyRecord::getUserId, userId)
                .eq(HealthDailyRecord::getRecordDate, request.getRecordDate());
        List<HealthDailyRecord> existingRecords = healthRecordMapper.selectList(queryWrapper);

        HealthDailyRecord record;
        if (existingRecords != null && !existingRecords.isEmpty()) {
            HealthDailyRecord existing = existingRecords.get(0);
            existing.setCurrentWeight(request.getCurrentWeight());
            existing.setCaloriesIntake(request.getCaloriesIntake());
            existing.setCaloriesBurned(request.getCaloriesBurned());
            existing.setSleepHours(request.getSleepHours());
            existing.setSteps(request.getSteps());
            existing.setExerciseMinutes(request.getExerciseMinutes());
            existing.setMoodLevel(request.getMoodLevel());
            existing.setEnergyLevel(request.getEnergyLevel());
            existing.setStressLevel(request.getStressLevel());
            healthRecordMapper.updateById(existing);
            record = existing;
        } else {
            record = new HealthDailyRecord();
            record.setUserId(userId);
            record.setRecordDate(request.getRecordDate());
            record.setCurrentWeight(request.getCurrentWeight());
            record.setCaloriesIntake(request.getCaloriesIntake());
            record.setCaloriesBurned(request.getCaloriesBurned());
            record.setSleepHours(request.getSleepHours());
            record.setSteps(request.getSteps());
            record.setExerciseMinutes(request.getExerciseMinutes());
            record.setMoodLevel(request.getMoodLevel());
            record.setEnergyLevel(request.getEnergyLevel());
            record.setStressLevel(request.getStressLevel());
            healthRecordMapper.insert(record);
        }

        eventPublisher.publishEvent(new DailyCheckInEvent(this, userId, record.getId()));
    }

    @Override
    public Map<String, Object> getChartData(Long userId, LocalDate startDate, LocalDate endDate) {
        List<HealthDailyRecord> records = healthRecordMapper.findByUserIdAndDateRange(userId, startDate, endDate);

        List<String> dates = new ArrayList<>();
        List<BigDecimal> weights = new ArrayList<>();
        List<Integer> caloriesIn = new ArrayList<>();
        List<Integer> caloriesOut = new ArrayList<>();
        List<Integer> netCalories = new ArrayList<>();
        List<BigDecimal> sleepHours = new ArrayList<>();
        List<Integer> steps = new ArrayList<>();
        List<Integer> exerciseMinutes = new ArrayList<>();
        List<Integer> moodLevels = new ArrayList<>();
        List<Integer> energyLevels = new ArrayList<>();
        List<Integer> stressLevels = new ArrayList<>();

        for (HealthDailyRecord record : records) {
            dates.add(record.getRecordDate().toString());
            weights.add(record.getCurrentWeight());
            caloriesIn.add(record.getCaloriesIntake() != null ? record.getCaloriesIntake() : 0);
            caloriesOut.add(record.getCaloriesBurned() != null ? record.getCaloriesBurned() : 0);
            netCalories.add((record.getCaloriesIntake() != null ? record.getCaloriesIntake() : 0)
                    - (record.getCaloriesBurned() != null ? record.getCaloriesBurned() : 0));
            sleepHours.add(record.getSleepHours());
            steps.add(record.getSteps() != null ? record.getSteps() : 0);
            exerciseMinutes.add(record.getExerciseMinutes() != null ? record.getExerciseMinutes() : 0);
            moodLevels.add(record.getMoodLevel());
            energyLevels.add(record.getEnergyLevel());
            stressLevels.add(record.getStressLevel());
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("dates", dates);
        result.put("weights", weights);
        result.put("caloriesIn", caloriesIn);
        result.put("caloriesOut", caloriesOut);
        result.put("netCalories", netCalories);
        result.put("sleepHours", sleepHours);
        result.put("steps", steps);
        result.put("exerciseMinutes", exerciseMinutes);
        result.put("moodLevels", moodLevels);
        result.put("energyLevels", energyLevels);
        result.put("stressLevels", stressLevels);

        return result;
    }
}
