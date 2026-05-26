package com.selfpline.service;

import com.selfpline.model.dto.request.LoginRequest;
import com.selfpline.model.dto.request.RegisterRequest;
import com.selfpline.model.dto.request.UpdateProfileRequest;
import com.selfpline.model.dto.response.LoginResponse;
import com.selfpline.model.entity.SysUser;

public interface UserService {

    void register(RegisterRequest request);

    LoginResponse login(LoginRequest request);

    SysUser getById(Long userId);

    void updateProfile(Long userId, UpdateProfileRequest request);
}
