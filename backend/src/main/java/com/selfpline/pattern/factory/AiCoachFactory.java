package com.selfpline.pattern.factory;

import com.selfpline.pattern.strategy.AiCoachStrategy;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

public class AiCoachFactory {

    private final Map<String, AiCoachStrategy> strategyMap;

    public AiCoachFactory(List<AiCoachStrategy> strategies) {
        this.strategyMap = strategies.stream()
                .collect(Collectors.toMap(AiCoachStrategy::getCoachKey, Function.identity()));
    }

    public AiCoachStrategy getStrategy(String coachKey) {
        AiCoachStrategy strategy = strategyMap.get(coachKey);
        if (strategy == null) {
            throw new IllegalArgumentException("未知的教练类型: " + coachKey);
        }
        return strategy;
    }
}
