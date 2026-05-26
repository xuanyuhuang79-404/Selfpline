package com.selfpline.service.impl;

import com.selfpline.dao.HealthDailyRecordMapper;
import com.selfpline.dao.SysUserMapper;
import com.selfpline.model.dto.request.LoginRequest;
import com.selfpline.model.dto.request.RegisterRequest;
import com.selfpline.model.dto.request.UpdateProfileRequest;
import com.selfpline.model.dto.response.LoginResponse;
import com.selfpline.model.entity.SysUser;
import com.selfpline.model.entity.HealthDailyRecord;
import com.selfpline.service.UserService;
import com.selfpline.config.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final SysUserMapper userMapper;
    private final HealthDailyRecordMapper healthRecordMapper;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Override
    public void register(RegisterRequest request) {
        SysUser existingUser = userMapper.findByUsername(request.getUsername());
        if (existingUser != null) {
            throw new IllegalArgumentException("用户名已存在");
        }

        SysUser user = new SysUser();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setHeight(request.getHeight());
        user.setWeight(request.getWeight());
        user.setHealthGoal(request.getHealthGoal());
        user.setMedicalHistory(request.getMedicalHistory());

        userMapper.insert(user);
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        SysUser user = userMapper.findByUsername(request.getUsername());
        if (user == null) {
            throw new IllegalArgumentException("用户名或密码错误");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("用户名或密码错误");
        }

        String token = jwtUtil.generateToken(user.getId());
        return new LoginResponse(user.getId(), user.getUsername(), token);
    }

    @Override
    public SysUser getById(Long userId) {
        SysUser user = userMapper.selectById(userId);
        if (user == null) {
            return null;
        }
        HealthDailyRecord latestWeightRecord = healthRecordMapper.findLatestWithWeightByUserId(userId);
        if (latestWeightRecord != null && latestWeightRecord.getCurrentWeight() != null) {
            user.setWeight(latestWeightRecord.getCurrentWeight());
        }
        return user;
    }

    @Override
    public void updateProfile(Long userId, UpdateProfileRequest request) {
        SysUser user = userMapper.selectById(userId);
        if (user == null) {
            throw new IllegalArgumentException("用户不存在");
        }

        if (request.getHeight() != null) {
            user.setHeight(request.getHeight());
        }
        if (request.getHealthGoal() != null) {
            user.setHealthGoal(request.getHealthGoal().trim());
        }
        if (request.getMedicalHistory() != null) {
            user.setMedicalHistory(request.getMedicalHistory());
        }
        if (request.getAiPreferencePrompt() != null) {
            String prompt = request.getAiPreferencePrompt().trim();
            user.setAiPreferencePrompt(prompt);
        }

        userMapper.updateById(user);
    }
}
