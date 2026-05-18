package com.selfpline.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.selfpline.model.entity.PlanDailyLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.util.List;

@Mapper
public interface PlanDailyLogMapper extends BaseMapper<PlanDailyLog> {

    @Select("SELECT * FROM plan_daily_log WHERE plan_id = #{planId} AND record_date BETWEEN #{startDate} AND #{endDate} ORDER BY record_date ASC")
    List<PlanDailyLog> findByPlanIdAndDateRange(@Param("planId") Long planId,
                                                 @Param("startDate") LocalDate startDate,
                                                 @Param("endDate") LocalDate endDate);

    @Select("SELECT * FROM plan_daily_log WHERE plan_id = #{planId} AND record_date = #{recordDate}")
    PlanDailyLog findByPlanIdAndDate(@Param("planId") Long planId, @Param("recordDate") LocalDate recordDate);

    @Select("SELECT COUNT(*) FROM plan_daily_log WHERE plan_id = #{planId} AND is_completed = true")
    int countCompletedDays(@Param("planId") Long planId);

    @Select("SELECT * FROM plan_daily_log WHERE user_id = #{userId} AND record_date BETWEEN #{startDate} AND #{endDate} ORDER BY record_date ASC")
    List<PlanDailyLog> findByUserIdAndDateRange(@Param("userId") Long userId,
                                                 @Param("startDate") LocalDate startDate,
                                                 @Param("endDate") LocalDate endDate);
}
