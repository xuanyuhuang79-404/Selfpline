package com.selfpline.service;

import com.selfpline.model.dto.request.DailyLogRequest;
import com.selfpline.model.dto.response.PlanCardResponse;
import com.selfpline.model.dto.response.PlanDetailResponse;
import com.selfpline.model.dto.response.PlanDetailResponse.DailyLogItem;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface PlanService {

    List<PlanCardResponse> getDashboard(Long userId);

    PlanDetailResponse getPlanDetail(Long planId, Long userId);

    void submitDailyLog(Long userId, DailyLogRequest request);

    Long confirmPlan(Long userId, Map<String, Object> planData);

    List<DailyLogItem> getDailyLogs(Long planId, Long userId, LocalDate startDate, LocalDate endDate);
}
