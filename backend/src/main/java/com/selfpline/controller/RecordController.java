package com.selfpline.controller;

import com.selfpline.common.Result;
import com.selfpline.model.dto.request.DailyRecordRequest;
import com.selfpline.model.dto.response.DailyRecordResponse;
import com.selfpline.service.RecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/record")
@RequiredArgsConstructor
public class RecordController {

    private final RecordService recordService;

    @GetMapping("/today")
    public Result<DailyRecordResponse> getTodayRecord(@RequestAttribute("userId") Long userId) {
        return Result.success(recordService.getRecord(userId, LocalDate.now()));
    }

    @GetMapping
    public Result<DailyRecordResponse> getRecord(@RequestAttribute("userId") Long userId,
                                                 @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate recordDate) {
        return Result.success(recordService.getRecord(userId, recordDate));
    }

    @PostMapping("/today")
    public Result<Void> saveTodayRecord(@RequestAttribute("userId") Long userId,
                                        @RequestBody(required = false) DailyRecordRequest request) {
        recordService.saveTodayRecord(userId, request);
        return Result.success();
    }

    @DeleteMapping("/today")
    public Result<Void> resetTodayRecord(@RequestAttribute("userId") Long userId) {
        recordService.resetTodayRecord(userId);
        return Result.success();
    }
}
