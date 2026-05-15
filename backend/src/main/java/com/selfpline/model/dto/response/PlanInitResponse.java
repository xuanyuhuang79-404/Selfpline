package com.selfpline.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PlanInitResponse {

    private String sessionId;
    private String aiMessage;
}
