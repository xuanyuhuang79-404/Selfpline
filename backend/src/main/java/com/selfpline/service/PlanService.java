package com.selfpline.service;

import com.selfpline.model.dto.request.DailyLogRequest;
import com.selfpline.model.dto.request.PlanUpdateRequest;
import com.selfpline.model.dto.response.PlanCardResponse;
import com.selfpline.model.dto.response.PlanDetailResponse;
import com.selfpline.model.dto.response.PlanDetailResponse.DailyLogItem;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface PlanService {

    List<PlanCardResponse> getDashboard(Long userId);

    List<PlanCardResponse> listPlans(Long userId, Integer status, Integer direction, String keyword);

    PlanDetailResponse getPlanDetail(Long planId, Long userId);

    void updatePlan(Long planId, Long userId, PlanUpdateRequest request);

    void archivePlan(Long planId, Long userId);

    void restorePlan(Long planId, Long userId);

    void deletePlan(Long planId, Long userId);

    void submitDailyLog(Long userId, DailyLogRequest request);

    Long confirmPlan(Long userId, Map<String, Object> planData);

    List<DailyLogItem> getDailyLogs(Long planId, Long userId, LocalDate startDate, LocalDate endDate);
}
