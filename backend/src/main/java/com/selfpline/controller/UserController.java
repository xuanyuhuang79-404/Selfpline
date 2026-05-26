package com.selfpline.controller;

import com.selfpline.common.Result;
import com.selfpline.model.dto.request.LoginRequest;
import com.selfpline.model.dto.request.RegisterRequest;
import com.selfpline.model.dto.request.UpdateProfileRequest;
import com.selfpline.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping("/register")
    public Result<Void> register(@Valid @RequestBody RegisterRequest request) {
        userService.register(request);
        return Result.success();
    }

    @PostMapping("/login")
    public Result<?> login(@Valid @RequestBody LoginRequest request) {
        return Result.success(userService.login(request));
    }

    @GetMapping("/profile")
    public Result<?> getProfile(@RequestAttribute("userId") Long userId) {
        return Result.success(userService.getById(userId));
    }

    @PutMapping("/profile")
    public Result<Void> updateProfile(@RequestAttribute("userId") Long userId,
                                       @Valid @RequestBody UpdateProfileRequest request) {
        userService.updateProfile(userId, request);
        return Result.success();
    }

}
