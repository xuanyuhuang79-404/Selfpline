package com.selfpline.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.selfpline.model.entity.HealthDailyRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.util.List;

@Mapper
public interface HealthDailyRecordMapper extends BaseMapper<HealthDailyRecord> {

    @Select("SELECT * FROM health_daily_record WHERE user_id = #{userId} AND record_date BETWEEN #{startDate} AND #{endDate} ORDER BY record_date ASC")
    List<HealthDailyRecord> findByUserIdAndDateRange(@Param("userId") Long userId,
                                                      @Param("startDate") LocalDate startDate,
                                                      @Param("endDate") LocalDate endDate);
}
