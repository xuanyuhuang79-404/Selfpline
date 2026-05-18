package com.selfpline.controller;

import com.selfpline.common.Result;
import com.selfpline.model.dto.request.CommunityCommentRequest;
import jakarta.validation.Valid;
import com.selfpline.service.CommunityService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService communityService;

    @GetMapping("/feed")
    public Result<?> getFeed(@RequestAttribute("userId") Long userId,
                             @RequestParam(defaultValue = "1") int page,
                             @RequestParam(defaultValue = "10") int size) {
        return Result.success(communityService.getFeed(userId, page, size));
    }

    @PostMapping("/post")
    public Result<?> createPost(@RequestAttribute("userId") Long userId,
                                @RequestParam String content,
                                @RequestParam(required = false) String imageUrl) {
        return Result.success(communityService.createPost(userId, content, imageUrl));
    }

    @PostMapping("/post/{postId}/like")
    public Result<?> likePost(@RequestAttribute("userId") Long userId,
                              @PathVariable Long postId) {
        return Result.success(communityService.toggleLike(userId, postId));
    }

    @GetMapping("/post/{postId}")
    public Result<?> getPostDetail(@RequestAttribute("userId") Long userId,
                                   @PathVariable Long postId) {
        return Result.success(communityService.getPostDetail(userId, postId));
    }

    @GetMapping("/post/{postId}/comments")
    public Result<?> getComments(@PathVariable Long postId) {
        return Result.success(communityService.getComments(postId));
    }

    @PostMapping("/post/{postId}/comment")
    public Result<?> createComment(@RequestAttribute("userId") Long userId,
                                   @PathVariable Long postId,
                                   @Valid @RequestBody CommunityCommentRequest request) {
        return Result.success(communityService.createComment(userId, postId, request.getContent()));
    }

    @DeleteMapping("/comment/{commentId}")
    public Result<Void> deleteComment(@RequestAttribute("userId") Long userId,
                                      @PathVariable Long commentId) {
        communityService.deleteComment(userId, commentId);
        return Result.success();
    }
}
