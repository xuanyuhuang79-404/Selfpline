package com.selfpline.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.selfpline.dao.CommunityCommentMapper;
import com.selfpline.dao.CommunityPostLikeMapper;
import com.selfpline.dao.CommunityPostMapper;
import com.selfpline.dao.SysUserMapper;
import com.selfpline.model.dto.response.CommunityCommentResponse;
import com.selfpline.model.dto.response.CommunityPostResponse;
import com.selfpline.model.dto.response.LikeToggleResponse;
import com.selfpline.model.entity.CommunityComment;
import com.selfpline.model.entity.CommunityPost;
import com.selfpline.model.entity.CommunityPostLike;
import com.selfpline.model.entity.SysUser;
import com.selfpline.service.CommunityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommunityServiceImpl implements CommunityService {

    private final CommunityPostMapper postMapper;
    private final CommunityCommentMapper commentMapper;
    private final CommunityPostLikeMapper likeMapper;
    private final SysUserMapper userMapper;

    @Override
    public CommunityPostResponse createPost(Long userId, String content, String imageUrl) {
        if (!StringUtils.hasText(content)) {
            throw new IllegalArgumentException("动态内容不能为空");
        }
        String normalizedContent = content.trim();
        if (normalizedContent.length() > 500) {
            throw new IllegalArgumentException("动态内容最多500个字符");
        }
        String normalizedImageUrl = normalizeImageUrl(imageUrl);
        CommunityPost post = new CommunityPost();
        post.setUserId(userId);
        post.setContent(normalizedContent);
        post.setImageUrl(normalizedImageUrl);
        post.setLikeCount(0);
        post.setCommentCount(0);
        postMapper.insert(post);
        return toPostResponse(post, userId, loadUsernames(List.of(userId)));
    }

    @Override
    public List<CommunityPostResponse> getFeed(Long userId, int page, int size) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 30);
        Page<CommunityPost> pageObj = new Page<>(safePage, safeSize);
        LambdaQueryWrapper<CommunityPost> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.orderByDesc(CommunityPost::getCreateTime);
        postMapper.selectPage(pageObj, queryWrapper);
        List<CommunityPost> posts = pageObj.getRecords();
        Map<Long, String> usernames = loadUsernames(posts.stream()
                .map(CommunityPost::getUserId)
                .distinct()
                .collect(Collectors.toList()));
        return posts.stream()
                .map(post -> toPostResponse(post, userId, usernames))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public LikeToggleResponse toggleLike(Long userId, Long postId) {
        CommunityPost post = postMapper.selectById(postId);
        if (post == null) {
            throw new IllegalArgumentException("动态不存在");
        }

        CommunityPostLike existing = findLike(userId, postId);
        boolean liked;
        if (existing == null) {
            CommunityPostLike like = new CommunityPostLike();
            like.setPostId(postId);
            like.setUserId(userId);
            likeMapper.insert(like);
            liked = true;
        } else {
            likeMapper.deleteById(existing.getId());
            liked = false;
        }
        post.setLikeCount(countLikes(postId));
        postMapper.updateById(post);
        return new LikeToggleResponse(liked, post.getLikeCount());
    }

    @Override
    public CommunityPostResponse getPostDetail(Long userId, Long postId) {
        CommunityPost post = postMapper.selectById(postId);
        if (post == null) {
            throw new IllegalArgumentException("动态不存在");
        }
        return toPostResponse(post, userId, loadUsernames(List.of(post.getUserId())));
    }

    @Override
    public List<CommunityCommentResponse> getComments(Long postId) {
        CommunityPost post = postMapper.selectById(postId);
        if (post == null) {
            throw new IllegalArgumentException("动态不存在");
        }
        List<CommunityComment> comments = commentMapper.selectList(new LambdaQueryWrapper<CommunityComment>()
                .eq(CommunityComment::getPostId, postId)
                .orderByAsc(CommunityComment::getCreateTime));
        Map<Long, String> usernames = loadUsernames(comments.stream()
                .map(CommunityComment::getUserId)
                .distinct()
                .collect(Collectors.toList()));
        return comments.stream()
                .map(comment -> toCommentResponse(comment, usernames))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CommunityCommentResponse createComment(Long userId, Long postId, String content) {
        if (!StringUtils.hasText(content)) {
            throw new IllegalArgumentException("评论内容不能为空");
        }
        CommunityPost post = postMapper.selectById(postId);
        if (post == null) {
            throw new IllegalArgumentException("动态不存在");
        }

        CommunityComment comment = new CommunityComment();
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setContent(content.trim());
        commentMapper.insert(comment);

        post.setCommentCount(countComments(postId));
        postMapper.updateById(post);

        return toCommentResponse(comment, loadUsernames(List.of(userId)));
    }

    @Override
    @Transactional
    public void deleteComment(Long userId, Long commentId) {
        CommunityComment comment = commentMapper.selectById(commentId);
        if (comment == null) {
            throw new IllegalArgumentException("评论不存在");
        }
        if (!userId.equals(comment.getUserId())) {
            throw new IllegalArgumentException("只能删除自己的评论");
        }
        CommunityPost post = postMapper.selectById(comment.getPostId());
        commentMapper.deleteById(commentId);
        if (post != null) {
            post.setCommentCount(countComments(post.getId()));
            postMapper.updateById(post);
        }
    }

    private CommunityPostLike findLike(Long userId, Long postId) {
        return likeMapper.selectOne(new LambdaQueryWrapper<CommunityPostLike>()
                .eq(CommunityPostLike::getUserId, userId)
                .eq(CommunityPostLike::getPostId, postId)
                .last("LIMIT 1"));
    }

    private CommunityPostResponse toPostResponse(CommunityPost post, Long currentUserId, Map<Long, String> usernames) {
        boolean liked = currentUserId != null && findLike(currentUserId, post.getId()) != null;
        int likeCount = countLikes(post.getId());
        int commentCount = countComments(post.getId());
        return CommunityPostResponse.builder()
                .id(post.getId())
                .userId(post.getUserId())
                .username(usernames.getOrDefault(post.getUserId(), "Selfpline 用户"))
                .content(post.getContent())
                .imageUrl(post.getImageUrl())
                .likeCount(likeCount)
                .commentCount(commentCount)
                .likedByMe(liked)
                .createTime(post.getCreateTime() != null ? post.getCreateTime().toString() : null)
                .build();
    }

    private CommunityCommentResponse toCommentResponse(CommunityComment comment, Map<Long, String> usernames) {
        return CommunityCommentResponse.builder()
                .id(comment.getId())
                .postId(comment.getPostId())
                .userId(comment.getUserId())
                .username(usernames.getOrDefault(comment.getUserId(), "Selfpline 用户"))
                .content(comment.getContent())
                .createTime(comment.getCreateTime() != null ? comment.getCreateTime().toString() : null)
                .build();
    }

    private Map<Long, String> loadUsernames(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Collections.emptyMap();
        }
        List<SysUser> users = userMapper.selectBatchIds(userIds);
        if (users == null || users.isEmpty()) {
            return Collections.emptyMap();
        }
        return users.stream().collect(Collectors.toMap(SysUser::getId, SysUser::getUsername, (a, b) -> a));
    }

    private String normalizeImageUrl(String imageUrl) {
        if (!StringUtils.hasText(imageUrl)) {
            return null;
        }
        String value = imageUrl.trim();
        if (value.length() > 255) {
            throw new IllegalArgumentException("图片链接最多255个字符");
        }
        if (!value.startsWith("http://") && !value.startsWith("https://")) {
            throw new IllegalArgumentException("图片链接必须以 http:// 或 https:// 开头");
        }
        return value;
    }

    private int countLikes(Long postId) {
        Long count = likeMapper.selectCount(new LambdaQueryWrapper<CommunityPostLike>()
                .eq(CommunityPostLike::getPostId, postId));
        return count != null ? count.intValue() : 0;
    }

    private int countComments(Long postId) {
        Long count = commentMapper.selectCount(new LambdaQueryWrapper<CommunityComment>()
                .eq(CommunityComment::getPostId, postId));
        return count != null ? count.intValue() : 0;
    }
}
