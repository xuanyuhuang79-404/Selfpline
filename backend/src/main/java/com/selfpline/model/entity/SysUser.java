package com.selfpline.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("sys_user")
public class SysUser {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String username;
    private String password;
    private BigDecimal height;
    private BigDecimal weight;
    private String healthGoal;
    private String medicalHistory;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
