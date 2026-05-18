package com.selfpline.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CommunityCommentRequest {

    @NotBlank(message = "评论内容不能为空")
    @Size(max = 200, message = "评论最多200个字符")
    private String content;
}
