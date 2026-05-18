package com.selfpline.controller;

import com.selfpline.common.Result;
import com.selfpline.model.dto.request.DailyLogRequest;
import com.selfpline.model.dto.request.PlanUpdateRequest;
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

    @GetMapping("/list")
    public Result<?> listPlans(@RequestAttribute("userId") Long userId,
                               @RequestParam(required = false) Integer status,
                               @RequestParam(required = false) Integer direction,
                               @RequestParam(required = false) String keyword) {
        return Result.success(planService.listPlans(userId, status, direction, keyword));
    }

    @GetMapping("/{planId}/detail")
    public Result<?> getDetail(@PathVariable Long planId,
                               @RequestAttribute("userId") Long userId) {
        return Result.success(planService.getPlanDetail(planId, userId));
    }

    @PutMapping("/{planId}")
    public Result<Void> updatePlan(@PathVariable Long planId,
                                   @RequestAttribute("userId") Long userId,
                                   @Valid @RequestBody PlanUpdateRequest request) {
        planService.updatePlan(planId, userId, request);
        return Result.success();
    }

    @PostMapping("/{planId}/archive")
    public Result<Void> archivePlan(@PathVariable Long planId,
                                    @RequestAttribute("userId") Long userId) {
        planService.archivePlan(planId, userId);
        return Result.success();
    }

    @PostMapping("/{planId}/restore")
    public Result<Void> restorePlan(@PathVariable Long planId,
                                    @RequestAttribute("userId") Long userId) {
        planService.restorePlan(planId, userId);
        return Result.success();
    }

    @DeleteMapping("/{planId}")
    public Result<Void> deletePlan(@PathVariable Long planId,
                                   @RequestAttribute("userId") Long userId) {
        planService.deletePlan(planId, userId);
        return Result.success();
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
