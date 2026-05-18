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
    public void saveTodayRecord(Long userId, DailyRecordRequest request) {
        DailyRecordRequest safeRequest = request != null ? request : new DailyRecordRequest();
        LocalDate targetDate = safeRequest.getRecordDate() != null ? safeRequest.getRecordDate() : LocalDate.now();
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
}
