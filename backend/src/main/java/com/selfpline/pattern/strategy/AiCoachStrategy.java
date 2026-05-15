package com.selfpline.pattern.strategy;

public interface AiCoachStrategy {

    String getCoachKey();

    String getSystemPrompt(String userContext, String planContext);
}
