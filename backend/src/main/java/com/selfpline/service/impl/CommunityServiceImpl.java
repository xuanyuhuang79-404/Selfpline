package com.selfpline.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.selfpline.dao.CommunityPostMapper;
import com.selfpline.model.entity.CommunityPost;
import com.selfpline.service.CommunityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CommunityServiceImpl implements CommunityService {

    private final CommunityPostMapper postMapper;

    @Override
    public CommunityPost createPost(Long userId, String content, String imageUrl) {
        CommunityPost post = new CommunityPost();
        post.setUserId(userId);
        post.setContent(content);
        post.setImageUrl(imageUrl);
        post.setLikeCount(0);
        post.setCommentCount(0);
        postMapper.insert(post);
        return post;
    }

    @Override
    public List<CommunityPost> getFeed(int page, int size) {
        Page<CommunityPost> pageObj = new Page<>(page, size);
        LambdaQueryWrapper<CommunityPost> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.orderByDesc(CommunityPost::getCreateTime);
        postMapper.selectPage(pageObj, queryWrapper);
        return pageObj.getRecords();
    }

    @Override
    public void likePost(Long postId) {
        CommunityPost post = postMapper.selectById(postId);
        if (post == null) {
            throw new IllegalArgumentException("动态不存在");
        }
        post.setLikeCount(post.getLikeCount() + 1);
        postMapper.updateById(post);
    }

    @Override
    public CommunityPost getPostDetail(Long postId) {
        return postMapper.selectById(postId);
    }
}
