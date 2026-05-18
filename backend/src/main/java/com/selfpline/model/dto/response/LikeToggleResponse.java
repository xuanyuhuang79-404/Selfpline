package com.selfpline.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LikeToggleResponse {

    private Boolean liked;
    private Integer likeCount;
}
