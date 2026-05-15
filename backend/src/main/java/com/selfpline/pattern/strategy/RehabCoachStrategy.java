package com.selfpline.pattern.strategy;

import com.selfpline.dao.AiCoachConfigMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RehabCoachStrategy implements AiCoachStrategy {

    private final AiCoachConfigMapper coachConfigMapper;

    @Override
    public String getCoachKey() {
        return "REHAB_COACH";
    }

    @Override
    public String getSystemPrompt(String userContext, String planContext) {
        var config = coachConfigMapper.findByCoachKey("REHAB_COACH");
        String basePrompt = config != null && config.getSystemPrompt() != null
                ? config.getSystemPrompt()
                : "你是一位温柔耐心的康复理疗师。";
        return basePrompt + "\n\n---\n用户档案:\n" + userContext + "\n\n计划上下文:\n" + planContext;
    }
}
