package com.selfpline.model.dto.deepseek;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DeepSeekChatRequest {
    private String model;
    private List<ChatMessage> messages;
    @Builder.Default
    private Double temperature = 0.7;
    @JsonProperty("max_tokens")
    @Builder.Default
    private Integer maxTokens = 8000;
    @Builder.Default
    private Boolean stream = false;
    @JsonProperty("stream_options")
    private StreamOptions streamOptions;

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class StreamOptions {
        @Builder.Default
        @JsonProperty("include_usage")
        private Boolean includeUsage = true;
    }
}
