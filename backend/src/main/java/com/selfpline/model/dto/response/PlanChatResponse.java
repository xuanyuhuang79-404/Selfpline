package com.selfpline.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.Map;

@Data
@AllArgsConstructor
public class PlanChatResponse {

    private String aiMessage;
    private boolean planReady;
    private Map<String, Object> planSummary;
}
