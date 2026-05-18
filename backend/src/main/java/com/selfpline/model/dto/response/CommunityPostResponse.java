package com.selfpline.model.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CommunityPostResponse {

    private Long id;
    private Long userId;
    private String username;
    private String content;
    private String imageUrl;
    private Integer likeCount;
    private Integer commentCount;
    private Boolean likedByMe;
    private String createTime;
}
