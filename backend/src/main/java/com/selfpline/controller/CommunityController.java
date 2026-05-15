package com.selfpline.controller;

import com.selfpline.common.Result;
import com.selfpline.service.CommunityService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService communityService;

    @GetMapping("/feed")
    public Result<?> getFeed(@RequestParam(defaultValue = "1") int page,
                             @RequestParam(defaultValue = "10") int size) {
        return Result.success(communityService.getFeed(page, size));
    }

    @PostMapping("/post")
    public Result<?> createPost(@RequestAttribute("userId") Long userId,
                                @RequestParam String content,
                                @RequestParam(required = false) String imageUrl) {
        return Result.success(communityService.createPost(userId, content, imageUrl));
    }

    @PostMapping("/post/{postId}/like")
    public Result<Void> likePost(@PathVariable Long postId) {
        communityService.likePost(postId);
        return Result.success();
    }

    @GetMapping("/post/{postId}")
    public Result<?> getPostDetail(@PathVariable Long postId) {
        return Result.success(communityService.getPostDetail(postId));
    }
}
