package com.selfpline.model.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AiScenarioResponse {

    private String sceneKey;
    private String sceneName;
    private String sceneDescription;
    private String category;
    private String description;
    private String systemPrompt;
    private String defaultDirection;
    private String icon;
    private String accentColor;
    private Boolean planCreationSupported;
    private Boolean assistSupported;
    private Boolean coachChatSupported;
    private List<String> suggestedUserInputs;
    private List<String> safetyRules;
    private List<String> boundaries;
}
