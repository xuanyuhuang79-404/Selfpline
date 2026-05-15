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
        List<BigDecimal> sleepHours = new ArrayList<>();

        for (HealthDailyRecord record : records) {
            dates.add(record.getRecordDate().toString());
            weights.add(record.getCurrentWeight());
            caloriesIn.add(record.getCaloriesIntake() != null ? record.getCaloriesIntake() : 0);
            caloriesOut.add(record.getCaloriesBurned() != null ? record.getCaloriesBurned() : 0);
            sleepHours.add(record.getSleepHours());
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("dates", dates);
        result.put("weights", weights);
        result.put("caloriesIn", caloriesIn);
        result.put("caloriesOut", caloriesOut);
        result.put("sleepHours", sleepHours);

        return result;
    }
}
