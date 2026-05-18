package com.selfpline.service;

import com.selfpline.model.dto.request.DailyRecordRequest;
import com.selfpline.model.dto.response.DailyRecordResponse;

import java.time.LocalDate;

public interface RecordService {

    DailyRecordResponse getRecord(Long userId, LocalDate recordDate);

    void saveTodayRecord(Long userId, DailyRecordRequest request);

    void resetTodayRecord(Long userId);
}
