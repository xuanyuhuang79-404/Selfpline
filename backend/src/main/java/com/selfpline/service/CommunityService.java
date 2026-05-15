package com.selfpline.service;

import com.selfpline.model.entity.CommunityPost;

import java.util.List;

public interface CommunityService {

    CommunityPost createPost(Long userId, String content, String imageUrl);

    List<CommunityPost> getFeed(int page, int size);

    void likePost(Long postId);

    CommunityPost getPostDetail(Long postId);
}
