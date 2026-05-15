package com.selfpline.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.selfpline.model.entity.AiChatLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface AiChatLogMapper extends BaseMapper<AiChatLog> {

    @Select("SELECT * FROM ai_chat_log WHERE plan_id = #{planId} AND conversation_type = #{type} ORDER BY create_time DESC LIMIT #{limit}")
    List<AiChatLog> findRecentByPlanId(@Param("planId") Long planId,
                                        @Param("type") Integer conversationType,
                                        @Param("limit") int limit);

    @Select("SELECT * FROM ai_chat_log WHERE user_id = #{userId} AND plan_id IS NULL " +
            "AND conversation_type = #{type} AND coach_role = #{coachRole} " +
            "ORDER BY create_time DESC LIMIT #{limit}")
    List<AiChatLog> findRecentIndependentByRole(@Param("userId") Long userId,
                                                @Param("type") Integer conversationType,
                                                @Param("coachRole") String coachRole,
                                                @Param("limit") int limit);
}
