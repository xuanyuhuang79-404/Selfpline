package com.selfpline.service;

import com.selfpline.model.dto.deepseek.ChatMessage;

import java.util.List;
import java.util.function.Consumer;

public interface DeepSeekStreamService {

    /**
     * Send a streaming chat request to DeepSeek.
     *
     * @param messages    the conversation messages
     * @param onToken     called for each incremental content chunk (may be called from background threads)
     * @param onError     called when a non-fatal parse error occurs on a single chunk
     * @return the full accumulated assistant response
     * @throws com.selfpline.common.AiServiceException on connection/auth/API-level failures
     */
    String streamChat(List<ChatMessage> messages, Consumer<String> onToken, Consumer<String> onError);
}
