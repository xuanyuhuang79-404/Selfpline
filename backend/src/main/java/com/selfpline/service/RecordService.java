package com.selfpline.service;

import com.selfpline.model.dto.request.DailyRecordRequest;
import com.selfpline.model.dto.response.DailyRecordResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface RecordService {

    DailyRecordResponse getRecord(Long userId, LocalDate recordDate);

    List<DailyRecordResponse> getHistory(Long userId, LocalDate startDate, LocalDate endDate, Integer limit);

    Map<String, Object> getStats(Long userId, LocalDate startDate, LocalDate endDate);

    void saveTodayRecord(Long userId, DailyRecordRequest request);

    void resetTodayRecord(Long userId);
}
