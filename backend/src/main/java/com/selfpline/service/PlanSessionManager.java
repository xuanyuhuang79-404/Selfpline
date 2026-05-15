package com.selfpline.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfpline.model.dto.deepseek.ChatMessage;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Component
@ConditionalOnBean(StringRedisTemplate.class)
@RequiredArgsConstructor
public class PlanSessionManager {

    private static final String KEY_PREFIX = "selfpline:plan:session:";
    private static final Duration TTL = Duration.ofMinutes(30);
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public void createSession(String sessionId, PlanSessionData data) {
        String json = serialize(data);
        redisTemplate.opsForValue().set(KEY_PREFIX + sessionId, json, TTL);
    }

    public PlanSessionData getSession(String sessionId) {
        String json = redisTemplate.opsForValue().get(KEY_PREFIX + sessionId);
        if (json == null) return null;
        return deserialize(json);
    }

    public boolean sessionExists(String sessionId) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(KEY_PREFIX + sessionId));
    }

    public void addMessage(String sessionId, ChatMessage message) {
        PlanSessionData session = getSession(sessionId);
        if (session == null) throw new IllegalArgumentException("会话已过期，请重新开始");
        session.getMessages().add(message);
        createSession(sessionId, session);
    }

    public void deleteSession(String sessionId) {
        redisTemplate.delete(KEY_PREFIX + sessionId);
    }

    private String serialize(PlanSessionData data) {
        try { return objectMapper.writeValueAsString(data); }
        catch (JsonProcessingException e) { throw new RuntimeException("序列化会话数据失败", e); }
    }

    private PlanSessionData deserialize(String json) {
        try { return objectMapper.readValue(json, PlanSessionData.class); }
        catch (JsonProcessingException e) { throw new RuntimeException("反序列化会话数据失败", e); }
    }

    @Data
    public static class PlanSessionData {
        private String coachType;
        private String direction;
        private String topic;
        private String sceneKey;
        private Long userId;
        private List<ChatMessage> messages = new ArrayList<>();
    }
}
