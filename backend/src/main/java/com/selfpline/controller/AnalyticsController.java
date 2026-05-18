package com.selfpline.controller;

import com.selfpline.common.Result;
import com.selfpline.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/overview")
    public Result<?> overview(@RequestAttribute("userId") Long userId,
                              @RequestParam(required = false) Integer days) {
        return Result.success(analyticsService.getOverview(userId, days));
    }
}
