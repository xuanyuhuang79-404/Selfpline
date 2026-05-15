package com.selfpline.service;

import com.selfpline.model.dto.request.HealthRecordRequest;

import java.time.LocalDate;
import java.util.Map;

public interface HealthService {

    void submitDailyRecord(Long userId, HealthRecordRequest request);

    Map<String, Object> getChartData(Long userId, LocalDate startDate, LocalDate endDate);
}
