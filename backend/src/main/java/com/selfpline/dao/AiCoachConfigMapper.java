package com.selfpline.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.selfpline.model.entity.AiCoachConfig;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface AiCoachConfigMapper extends BaseMapper<AiCoachConfig> {

    @Select("SELECT * FROM ai_coach_config WHERE is_active = true ORDER BY sort_order ASC")
    List<AiCoachConfig> findAllActive();

    @Select("SELECT * FROM ai_coach_config WHERE coach_key = #{coachKey}")
    AiCoachConfig findByCoachKey(@Param("coachKey") String coachKey);
}
