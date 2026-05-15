package com.selfpline.controller;

import com.selfpline.common.Result;
import com.selfpline.model.dto.request.DailyLogRequest;
import com.selfpline.service.PlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/plan")
@RequiredArgsConstructor
public class PlanController {

    private final PlanService planService;

    @GetMapping("/dashboard")
    public Result<?> dashboard(@RequestAttribute("userId") Long userId) {
        return Result.success(planService.getDashboard(userId));
    }

    @GetMapping("/{planId}/detail")
    public Result<?> getDetail(@PathVariable Long planId,
                               @RequestAttribute("userId") Long userId) {
        return Result.success(planService.getPlanDetail(planId, userId));
    }

    @PostMapping("/daily-log")
    public Result<Void> submitDailyLog(@RequestAttribute("userId") Long userId,
                                       @Valid @RequestBody DailyLogRequest request) {
        planService.submitDailyLog(userId, request);
        return Result.success();
    }

    @GetMapping("/{planId}/daily-logs")
    public Result<?> getDailyLogs(@PathVariable Long planId,
                                  @RequestAttribute("userId") Long userId,
                                  @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                                  @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return Result.success(planService.getDailyLogs(planId, userId, startDate, endDate));
    }
}
