package com.selfpline.service;

import java.util.Map;

public interface AnalyticsService {

    Map<String, Object> getOverview(Long userId, Integer days);
}
