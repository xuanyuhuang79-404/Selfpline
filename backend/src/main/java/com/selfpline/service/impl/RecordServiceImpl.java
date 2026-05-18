package com.selfpline.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.selfpline.dao.HealthDailyRecordMapper;
import com.selfpline.dao.UserDailyJournalMapper;
import com.selfpline.model.dto.request.DailyRecordRequest;
import com.selfpline.model.dto.response.DailyRecordResponse;
import com.selfpline.model.entity.HealthDailyRecord;
import com.selfpline.model.entity.UserDailyJournal;
import com.selfpline.service.RecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecordServiceImpl implements RecordService {

    private final HealthDailyRecordMapper healthRecordMapper;
    private final UserDailyJournalMapper journalMapper;

    @Override
    public DailyRecordResponse getRecord(Long userId, LocalDate recordDate) {
        LocalDate targetDate = recordDate != null ? recordDate : LocalDate.now();
        HealthDailyRecord healthRecord = findHealthRecord(userId, targetDate);
        UserDailyJournal journal = findJournal(userId, targetDate);

        return DailyRecordResponse.builder()
                .recordDate(targetDate)
                .currentWeight(healthRecord != null ? healthRecord.getCurrentWeight() : null)
                .caloriesIntake(healthRecord != null ? healthRecord.getCaloriesIntake() : null)
                .caloriesBurned(healthRecord != null ? healthRecord.getCaloriesBurned() : null)
                .sleepHours(healthRecord != null ? healthRecord.getSleepHours() : null)
                .diaryText(journal != null ? journal.getDiaryText() : "")
                .healthRecordExists(healthRecord != null)
                .journalExists(journal != null)
                .build();
    }

    @Override
    public List<DailyRecordResponse> getHistory(Long userId, LocalDate startDate, LocalDate endDate, Integer limit) {
        LocalDate[] range = normalizeRange(startDate, endDate, 30);
        List<HealthDailyRecord> healthRecords = healthRecordMapper.findByUserIdAndDateRange(userId, range[0], range[1]);
        List<UserDailyJournal> journals = journalMapper.findByUserIdAndDateRange(userId, range[0], range[1]);

        Map<LocalDate, HealthDailyRecord> healthByDate = healthRecords.stream()
                .filter(record -> record.getRecordDate() != null)
                .collect(Collectors.toMap(HealthDailyRecord::getRecordDate, record -> record, (a, b) -> a, LinkedHashMap::new));
        Map<LocalDate, UserDailyJournal> journalByDate = journals.stream()
                .filter(journal -> journal.getRecordDate() != null)
                .collect(Collectors.toMap(UserDailyJournal::getRecordDate, journal -> journal, (a, b) -> a, LinkedHashMap::new));

        List<LocalDate> dates = new ArrayList<>();
        dates.addAll(healthByDate.keySet());
        for (LocalDate date : journalByDate.keySet()) {
            if (!dates.contains(date)) {
                dates.add(date);
            }
        }
        dates.sort(Comparator.reverseOrder());

        int safeLimit = limit == null ? 60 : Math.min(Math.max(limit, 1), 180);
        return dates.stream()
                .limit(safeLimit)
                .map(date -> toResponse(date, healthByDate.get(date), journalByDate.get(date)))
                .collect(Collectors.toList());
    }

    @Override
    public Map<String, Object> getStats(Long userId, LocalDate startDate, LocalDate endDate) {
        LocalDate[] range = normalizeRange(startDate, endDate, 30);
        List<HealthDailyRecord> records = healthRecordMapper.findByUserIdAndDateRange(userId, range[0], range[1]);

        List<String> dates = new ArrayList<>();
        List<Object> weights = new ArrayList<>();
        List<Integer> caloriesIn = new ArrayList<>();
        List<Integer> caloriesOut = new ArrayList<>();
        List<Object> sleepHours = new ArrayList<>();

        for (HealthDailyRecord record : records) {
            dates.add(record.getRecordDate() != null ? record.getRecordDate().toString() : "");
            weights.add(record.getCurrentWeight());
            caloriesIn.add(record.getCaloriesIntake() != null ? record.getCaloriesIntake() : 0);
            caloriesOut.add(record.getCaloriesBurned() != null ? record.getCaloriesBurned() : 0);
            sleepHours.add(record.getSleepHours());
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("startDate", range[0].toString());
        result.put("endDate", range[1].toString());
        result.put("dates", dates);
        result.put("weights", weights);
        result.put("caloriesIn", caloriesIn);
        result.put("caloriesOut", caloriesOut);
        result.put("sleepHours", sleepHours);
        result.put("recordCount", records.size());
        result.put("latestWeight", records.stream()
                .map(HealthDailyRecord::getCurrentWeight)
                .filter(Objects::nonNull)
                .reduce((first, second) -> second)
                .orElse(null));
        result.put("avgSleepHours", records.stream()
                .map(HealthDailyRecord::getSleepHours)
                .filter(Objects::nonNull)
                .mapToDouble(value -> value.doubleValue())
                .average()
                .orElse(0));
        return result;
    }

    @Override
    public void saveTodayRecord(Long userId, DailyRecordRequest request) {
        DailyRecordRequest safeRequest = request != null ? request : new DailyRecordRequest();
        LocalDate targetDate = LocalDate.now();
        upsertHealthRecord(userId, targetDate, safeRequest);
        upsertJournal(userId, targetDate, safeRequest.getDiaryText());
    }

    @Override
    public void resetTodayRecord(Long userId) {
        LocalDate today = LocalDate.now();
        healthRecordMapper.delete(new LambdaQueryWrapper<HealthDailyRecord>()
                .eq(HealthDailyRecord::getUserId, userId)
                .eq(HealthDailyRecord::getRecordDate, today));
        journalMapper.delete(new LambdaQueryWrapper<UserDailyJournal>()
                .eq(UserDailyJournal::getUserId, userId)
                .eq(UserDailyJournal::getRecordDate, today));
    }

    private void upsertHealthRecord(Long userId, LocalDate recordDate, DailyRecordRequest request) {
        HealthDailyRecord record = findHealthRecord(userId, recordDate);
        if (record == null) {
            record = new HealthDailyRecord();
            record.setUserId(userId);
            record.setRecordDate(recordDate);
        }

        record.setCurrentWeight(request.getCurrentWeight());
        record.setCaloriesIntake(request.getCaloriesIntake());
        record.setCaloriesBurned(request.getCaloriesBurned());
        record.setSleepHours(request.getSleepHours());

        if (record.getId() == null) {
            healthRecordMapper.insert(record);
        } else {
            healthRecordMapper.updateById(record);
        }
    }

    private void upsertJournal(Long userId, LocalDate recordDate, String diaryText) {
        UserDailyJournal journal = findJournal(userId, recordDate);
        if (journal == null && !StringUtils.hasText(diaryText)) {
            return;
        }

        if (journal == null) {
            journal = new UserDailyJournal();
            journal.setUserId(userId);
            journal.setRecordDate(recordDate);
        }
        journal.setDiaryText(diaryText);

        if (journal.getId() == null) {
            journalMapper.insert(journal);
        } else {
            journalMapper.updateById(journal);
        }
    }

    private HealthDailyRecord findHealthRecord(Long userId, LocalDate recordDate) {
        return healthRecordMapper.selectOne(new LambdaQueryWrapper<HealthDailyRecord>()
                .eq(HealthDailyRecord::getUserId, userId)
                .eq(HealthDailyRecord::getRecordDate, recordDate)
                .last("LIMIT 1"));
    }

    private UserDailyJournal findJournal(Long userId, LocalDate recordDate) {
        return journalMapper.selectOne(new LambdaQueryWrapper<UserDailyJournal>()
                .eq(UserDailyJournal::getUserId, userId)
                .eq(UserDailyJournal::getRecordDate, recordDate)
                .last("LIMIT 1"));
    }

    private DailyRecordResponse toResponse(LocalDate date, HealthDailyRecord healthRecord, UserDailyJournal journal) {
        return DailyRecordResponse.builder()
                .recordDate(date)
                .currentWeight(healthRecord != null ? healthRecord.getCurrentWeight() : null)
                .caloriesIntake(healthRecord != null ? healthRecord.getCaloriesIntake() : null)
                .caloriesBurned(healthRecord != null ? healthRecord.getCaloriesBurned() : null)
                .sleepHours(healthRecord != null ? healthRecord.getSleepHours() : null)
                .diaryText(journal != null ? journal.getDiaryText() : "")
                .healthRecordExists(healthRecord != null)
                .journalExists(journal != null)
                .build();
    }

    private LocalDate[] normalizeRange(LocalDate startDate, LocalDate endDate, int defaultDays) {
        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(defaultDays - 1L);
        if (start.isAfter(end)) {
            LocalDate tmp = start;
            start = end;
            end = tmp;
        }
        if (start.plusDays(365).isBefore(end)) {
            start = end.minusDays(365);
        }
        return new LocalDate[]{start, end};
    }
}
