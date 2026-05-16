package com.selfpline.service;

import com.selfpline.model.dto.request.AssistChatRequest;
import com.selfpline.model.dto.request.CoachChatRequest;
import com.selfpline.model.dto.request.PlanChatRequest;
import com.selfpline.model.dto.request.PlanInitRequest;
import com.selfpline.model.dto.response.CoachResponse;
import com.selfpline.model.dto.response.AiScenarioResponse;
import com.selfpline.model.dto.response.PlanChatResponse;
import com.selfpline.model.dto.response.PlanInitResponse;
import com.selfpline.model.entity.AiChatLog;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

public interface AiService {

    List<CoachResponse> getAvailableCoaches();

    List<AiScenarioResponse> getAiScenarios();

    PlanInitResponse initPlanCreation(Long userId, PlanInitRequest request);

    PlanChatResponse continuePlanChat(Long userId, PlanChatRequest request);

    String assistChat(Long userId, AssistChatRequest request);

    String coachChat(Long userId, CoachChatRequest request);

    List<AiChatLog> getAssistChatHistory(Long userId, Long planId, int page, int size);

    // Streaming endpoints
    SseEmitter initPlanCreationStream(Long userId, PlanInitRequest request);

    SseEmitter continuePlanChatStream(Long userId, PlanChatRequest request);

    SseEmitter coachChatStream(Long userId, CoachChatRequest request);

    SseEmitter assistChatStream(Long userId, AssistChatRequest request);
}
