package com.selfpline.config;

import com.selfpline.pattern.factory.AiCoachFactory;
import com.selfpline.pattern.strategy.AiCoachStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class FactoryConfig {

    @Bean
    public AiCoachFactory aiCoachFactory(List<AiCoachStrategy> strategies) {
        return new AiCoachFactory(strategies);
    }
}
