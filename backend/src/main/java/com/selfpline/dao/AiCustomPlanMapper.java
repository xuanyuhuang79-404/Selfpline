package com.selfpline.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.selfpline.model.entity.AiCustomPlan;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface AiCustomPlanMapper extends BaseMapper<AiCustomPlan> {

    @Select("SELECT * FROM ai_custom_plan WHERE user_id = #{userId} AND status = 1 ORDER BY created_at DESC")
    List<AiCustomPlan> findActivePlansByUserId(@Param("userId") Long userId);
}
