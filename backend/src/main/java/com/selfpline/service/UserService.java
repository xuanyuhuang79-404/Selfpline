package com.selfpline.service;

import com.selfpline.model.dto.request.LoginRequest;
import com.selfpline.model.dto.request.RegisterRequest;
import com.selfpline.model.dto.response.LoginResponse;
import com.selfpline.model.entity.SysNotification;
import com.selfpline.model.entity.SysUser;

import java.util.List;

public interface UserService {

    void register(RegisterRequest request);

    LoginResponse login(LoginRequest request);

    SysUser getById(Long userId);

    void updateProfile(Long userId, RegisterRequest request);

    List<SysNotification> getNotifications(Long userId);
}
