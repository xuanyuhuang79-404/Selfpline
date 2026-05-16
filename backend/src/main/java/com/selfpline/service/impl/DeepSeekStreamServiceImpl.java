package com.selfpline.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfpline.common.AiServiceException;
import com.selfpline.config.DeepSeekConfig;
import com.selfpline.model.dto.deepseek.DeepSeekChatRequest;
import com.selfpline.model.dto.deepseek.DeepSeekChatStreamChunk;
import com.selfpline.model.dto.deepseek.ChatMessage;
import com.selfpline.service.DeepSeekStreamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

@Service
@Slf4j
@RequiredArgsConstructor
public class DeepSeekStreamServiceImpl implements DeepSeekStreamService {

    private final DeepSeekConfig deepSeekConfig;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    @Override
    public String streamChat(List<ChatMessage> messages, Consumer<String> onToken, Consumer<String> onError) {
        String apiKey = validateApiKey();
        String baseUrl = validateBaseUrl();
        String model = resolveModel();

        DeepSeekChatRequest request = DeepSeekChatRequest.builder()
                .model(model)
                .messages(messages)
                .stream(true)
                .streamOptions(DeepSeekChatRequest.StreamOptions.builder().includeUsage(true).build())
                .build();

        String requestJson;
        try {
            requestJson = objectMapper.writeValueAsString(request);
        } catch (Exception e) {
            throw new AiServiceException("序列化 DeepSeek 请求失败", e);
        }

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/chat/completions"))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(120))
                .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8))
                .build();

        try {
            HttpResponse<java.io.InputStream> response = httpClient.send(httpRequest,
                    HttpResponse.BodyHandlers.ofInputStream());
            log.info("DeepSeek stream connected: status={}", response.statusCode());

            if (response.statusCode() >= 400) {
                String errorBody = readErrorBody(response);
                throw new AiServiceException(
                        "DeepSeek API调用失败: HTTP " + response.statusCode() + " - " + errorBody);
            }

            StringBuilder fullResponse = new StringBuilder();
            AtomicInteger chunkCount = new AtomicInteger(0);
            AtomicInteger tokenCount = new AtomicInteger(0);
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.isBlank()) continue;
                    if (!line.startsWith("data:")) continue;

                    chunkCount.incrementAndGet();
                    String data = line.substring(5).trim();
                    if ("[DONE]".equals(data.trim())) break;

                    try {
                        DeepSeekChatStreamChunk chunk = objectMapper.readValue(data, DeepSeekChatStreamChunk.class);
                        if (chunk.getChoices() != null) {
                            for (DeepSeekChatStreamChunk.Choice choice : chunk.getChoices()) {
                                if (choice.getDelta() != null && choice.getDelta().getContent() != null) {
                                    String content = choice.getDelta().getContent();
                                    fullResponse.append(content);
                                    tokenCount.incrementAndGet();
                                    onToken.accept(content);
                                }
                            }
                        }
                    } catch (Exception e) {
                        log.warn("Failed to parse SSE chunk: {}", data.substring(0, Math.min(200, data.length())));
                        onError.accept("chunk parse warning: " + e.getMessage());
                    }
                }
            }
            log.info("DeepSeek stream done: chunks={}, tokens={}, chars={}",
                    chunkCount.get(), tokenCount.get(), fullResponse.length());
            return fullResponse.toString();

        } catch (AiServiceException e) {
            throw e;
        } catch (java.net.http.HttpTimeoutException e) {
            throw new AiServiceException("DeepSeek 请求超时，请稍后重试", e);
        } catch (java.io.IOException e) {
            throw new AiServiceException("DeepSeek 网络异常: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AiServiceException("DeepSeek 请求被中断", e);
        } catch (Exception e) {
            throw new AiServiceException("调用DeepSeek流式API时发生错误: " + e.getMessage(), e);
        }
    }

    private String validateApiKey() {
        String apiKey = deepSeekConfig.getApiKey();
        if (apiKey == null || apiKey.isBlank() || "your-api-key".equalsIgnoreCase(apiKey.trim())) {
            throw new AiServiceException("DeepSeek API Key 未配置");
        }
        if (apiKey.trim().length() < 10) {
            throw new AiServiceException("DeepSeek API Key 太短，可能无效");
        }
        return apiKey.trim();
    }

    private String validateBaseUrl() {
        String baseUrl = deepSeekConfig.getBaseUrl();
        if (baseUrl == null || baseUrl.isBlank()) {
            throw new AiServiceException("DeepSeek baseUrl 未配置");
        }
        String trimmed = baseUrl.trim();
        if (!trimmed.startsWith("https://") && !trimmed.startsWith("http://")) {
            throw new AiServiceException("DeepSeek baseUrl 必须以 http:// 或 https:// 开头");
        }
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        if (trimmed.endsWith("/v1")) {
            log.warn("DeepSeek baseUrl should not include /v1; normalizing to root API host");
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed;
    }

    private String resolveModel() {
        String configuredModel = deepSeekConfig.getModel();
        if (configuredModel == null || configuredModel.isBlank()) {
            return "deepseek-v4-flash";
        }
        return configuredModel.trim();
    }

    private String readErrorBody(HttpResponse<?> response) {
        try (java.io.InputStream is = (java.io.InputStream) response.body();
             java.util.Scanner s = new java.util.Scanner(is, StandardCharsets.UTF_8).useDelimiter("\\A")) {
            return s.hasNext() ? s.next() : "";
        } catch (Exception e) {
            return "(unable to read error body)";
        }
    }
}
