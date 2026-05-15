package com.selfpline.controller;

import com.selfpline.common.Result;
import com.selfpline.model.dto.request.HealthRecordRequest;
import com.selfpline.service.HealthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    private final HealthService healthService;

    @PostMapping("/daily-record")
    public Result<Void> submitDailyRecord(@RequestAttribute("userId") Long userId,
                                          @Valid @RequestBody HealthRecordRequest request) {
        healthService.submitDailyRecord(userId, request);
        return Result.success();
    }

    @GetMapping("/chart-data")
    public Result<?> getChartData(@RequestAttribute("userId") Long userId,
                                  @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                                  @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return Result.success(healthService.getChartData(userId, startDate, endDate));
    }
}
