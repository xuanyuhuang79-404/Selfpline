package com.selfpline.controller;

import com.selfpline.common.Result;
import com.selfpline.model.dto.request.AssistChatRequest;
import com.selfpline.model.dto.request.CoachChatRequest;
import com.selfpline.model.dto.request.PlanChatRequest;
import com.selfpline.model.dto.request.PlanConfirmRequest;
import com.selfpline.model.dto.request.PlanInitRequest;
import com.selfpline.service.AiService;
import com.selfpline.service.PlanService;
import com.selfpline.service.PlanSessionManager;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;
    private final PlanService planService;

    @Autowired(required = false)
    private PlanSessionManager sessionManager;

    @GetMapping("/coaches")
    public Result<?> getCoaches() {
        return Result.success(aiService.getAvailableCoaches());
    }

    @GetMapping("/scenarios")
    public Result<?> getScenarios(@RequestParam(required = false) String category) {
        var scenarios = aiService.getAiScenarios();
        if (category != null && !category.isBlank()) {
            String normalizedCategory = category.trim().toLowerCase();
            scenarios = scenarios.stream()
                    .filter(scene -> normalizedCategory.equalsIgnoreCase(scene.getCategory()))
                    .filter(scene -> !"coach_chat".equals(normalizedCategory)
                            || Boolean.TRUE.equals(scene.getCoachChatSupported()))
                    .filter(scene -> !"plan_creation".equals(normalizedCategory)
                            || Boolean.TRUE.equals(scene.getPlanCreationSupported()))
                    .toList();
        }
        return Result.success(scenarios);
    }

    @PostMapping("/plan-init")
    public Result<?> planInit(@RequestAttribute("userId") Long userId,
                              @Valid @RequestBody PlanInitRequest request) {
        return Result.success(aiService.initPlanCreation(userId, request));
    }

    @PostMapping("/plan-chat")
    public Result<?> planChat(@RequestAttribute("userId") Long userId,
                              @Valid @RequestBody PlanChatRequest request) {
        return Result.success(aiService.continuePlanChat(userId, request));
    }

    @PostMapping("/plan-confirm")
    public Result<?> planConfirm(@RequestAttribute("userId") Long userId,
                                 @Valid @RequestBody PlanConfirmRequest request) {
        if (sessionManager != null) {
            if (!sessionManager.sessionExists(request.getSessionId())) {
                throw new IllegalArgumentException("会话已过期，请重新开始");
            }
            Long planId = planService.confirmPlan(userId, request.getPlanData());
            sessionManager.deleteSession(request.getSessionId());
            return Result.success(planId);
        }
        Long planId = planService.confirmPlan(userId, request.getPlanData());
        return Result.success(planId);
    }

    @PostMapping("/assist-chat")
    public Result<?> assistChat(@RequestAttribute("userId") Long userId,
                                @Valid @RequestBody AssistChatRequest request) {
        return Result.success(aiService.assistChat(userId, request));
    }

    @PostMapping("/coach-chat")
    public Result<?> coachChat(@RequestAttribute("userId") Long userId,
                               @Valid @RequestBody CoachChatRequest request) {
        return Result.success(aiService.coachChat(userId, request));
    }

    @GetMapping("/assist-chat/{planId}")
    public Result<?> getAssistChatHistory(@RequestAttribute("userId") Long userId,
                                          @PathVariable Long planId,
                                          @RequestParam(defaultValue = "1") int page,
                                          @RequestParam(defaultValue = "20") int size) {
        return Result.success(aiService.getAssistChatHistory(userId, planId, page, size));
    }
}
