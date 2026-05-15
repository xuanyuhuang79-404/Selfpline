package com.selfpline.model.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CoachResponse {

    private String coachKey;
    private String coachName;
    private String coachAvatar;
    private String coachDescription;
    private String tags;
}
