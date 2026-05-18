package com.selfpline.model.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CommunityCommentResponse {

    private Long id;
    private Long postId;
    private Long userId;
    private String username;
    private String content;
    private String createTime;
}
