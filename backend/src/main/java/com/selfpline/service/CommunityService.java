package com.selfpline.service;

import com.selfpline.model.dto.response.CommunityCommentResponse;
import com.selfpline.model.dto.response.CommunityPostResponse;
import com.selfpline.model.dto.response.LikeToggleResponse;

import java.util.List;

public interface CommunityService {

    CommunityPostResponse createPost(Long userId, String content, String imageUrl);

    List<CommunityPostResponse> getFeed(Long userId, int page, int size);

    LikeToggleResponse toggleLike(Long userId, Long postId);

    CommunityPostResponse getPostDetail(Long userId, Long postId);

    List<CommunityCommentResponse> getComments(Long postId);

    CommunityCommentResponse createComment(Long userId, Long postId, String content);

    void deleteComment(Long userId, Long commentId);
}
