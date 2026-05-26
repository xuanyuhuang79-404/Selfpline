const AnalyticsPage = {
    days: 30,
    data: null,
    chartInstances: {},
    resizeHandler: null,

    async render() {
        this.disposeCharts();
        this.showShell();
        document.getElementById('page-container').innerHTML = `
            <div class="workspace-page analytics-page">
                <section class="workspace-hero analytics-hero">
                    <div>
                        <p class="page-kicker">Analytics</p>
                        <h1>把长期变化看清楚</h1>
                        <p>数据来自每日记录、计划打卡和健康档案；进入页面即读取最新统计。</p>
                    </div>
                    <div class="segmented-control" role="group" aria-label="统计范围">
                        <button type="button" data-days="7" class="${this.days === 7 ? 'active' : ''}">7 天</button>
                        <button type="button" data-days="30" class="${this.days === 30 ? 'active' : ''}">30 天</button>
                    </div>
                </section>

                <div id="analytics-error" class="workspace-error hidden"></div>

                <section class="workspace-card analytics-section-title">
                    <div>
                        <h2>计划执行统计</h2>
                        <p>完成率、每日完成数量和 Build / Quit 结构。</p>
                    </div>
                </section>

                <section class="workspace-grid three-col analytics-chart-grid">
                    <article class="workspace-card">
                        <div class="chart-panel echarts-panel" id="analytics-plan-rate"></div>
                    </article>
                    <article class="workspace-card">
                        <div class="chart-panel echarts-panel" id="analytics-plan-bars"></div>
                    </article>
                    <article class="workspace-card">
                        <div class="chart-panel echarts-panel" id="analytics-plan-mix"></div>
                    </article>
                </section>

                <section class="workspace-card analytics-section-title">
                    <div>
                        <h2>身体指标趋势</h2>
                        <p>体重来自 Records 最新记录，BMI 使用最新体重和 Profile 身高计算。</p>
                    </div>
                </section>

                <section class="workspace-grid four-col analytics-chart-grid">
                    <article class="workspace-card">
                        <div class="chart-panel compact-chart echarts-panel" id="analytics-weight"></div>
                    </article>
                    <article class="workspace-card">
                        <div class="chart-panel compact-chart echarts-panel" id="analytics-sleep"></div>
                    </article>
                    <article class="workspace-card">
                        <div class="chart-panel compact-chart echarts-panel" id="analytics-steps"></div>
                    </article>
                    <article class="workspace-card">
                        <div class="chart-panel compact-chart echarts-panel" id="analytics-bmi"></div>
                    </article>
                </section>

                <section class="workspace-card analytics-section-title">
                    <div>
                        <h2>能量与运动</h2>
                        <p>净摄入能量 = 摄入卡路里 - 消耗卡路里。</p>
                    </div>
                </section>

                <section class="workspace-grid two-col analytics-chart-grid">
                    <article class="workspace-card">
                        <div class="chart-panel echarts-panel" id="analytics-net-calories"></div>
                    </article>
                    <article class="workspace-card">
                        <div class="chart-panel echarts-panel" id="analytics-exercise"></div>
                    </article>
                </section>

                <section class="workspace-card analytics-section-title">
                    <div>
                        <h2>心理状态</h2>
                        <p>心情、精力与压力使用同一张三线图对比。</p>
                    </div>
                </section>

                <section class="workspace-card">
                    <div class="chart-panel echarts-panel analytics-mental-chart" id="analytics-mental"></div>
                </section>
            </div>
        `;
        this.bindRangeSwitch();
        this.bindResize();
        await this.loadData();
    },

    showShell() {
        document.getElementById('top-nav').classList.remove('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');
        document.getElementById('fab-add-habit').classList.add('hidden');
    },

    bindRangeSwitch() {
        document.querySelectorAll('.segmented-control [data-days]').forEach(button => {
            button.addEventListener('click', () => {
                const nextDays = Number(button.dataset.days);
                if (!nextDays || nextDays === this.days) return;
                this.days = nextDays;
                this.render();
            });
        });
    },

    bindResize() {
        if (this.resizeHandler) return;
        this.resizeHandler = () => this.resizeCharts();
        window.addEventListener('resize', this.resizeHandler);
    },

    async loadData() {
        try {
            const error = document.getElementById('analytics-error');
            if (error) error.classList.add('hidden');
            const result = await apiClient.get(`/analytics/overview?days=${this.days}`);
            this.data = result.data || {};
            this.renderCharts(this.data);
        } catch (e) {
            this.showLoadError(e.message || '请稍后重试');
        }
    },

    renderCharts(data) {
        const trend = data.planTrend || {};
        const summary = data.summary || {};
        const health = data.healthTrend || {};
        const healthSummary = data.healthSummary || {};
        const planDates = trend.dates || [];
        const healthDates = health.dates || [];

        this.renderLineChart('analytics-plan-rate', '计划完成趋势', planDates, [
            { name: '完成率', data: trend.rate || [], color: '#ff7a3d' }
        ], {
            yName: '%',
            min: 0,
            max: 100,
            hasData: this.sumValues(trend.total || []) > 0,
            emptyText: '还没有计划完成趋势'
        });

        this.renderBarChart('analytics-plan-bars', '每日完成数量', planDates, trend.completed || [], {
            yName: '个',
            color: '#37c978',
            hasData: this.sumValues(trend.total || []) > 0,
            emptyText: '还没有打卡数据'
        });

        this.renderDonutChart('analytics-plan-mix', 'Build / Quit 比例', [
            { name: 'Build', value: summary.buildPlans || 0, itemStyle: { color: '#37c978' } },
            { name: 'Quit', value: summary.quitPlans || 0, itemStyle: { color: '#e9340b' } }
        ], '暂无计划结构数据');

        this.renderLineChart('analytics-weight', '体重趋势', healthDates, [
            { name: '体重', data: health.weights || [], color: '#2ea7df' }
        ], {
            yName: 'kg',
            hasData: this.hasAnyValue(health.weights),
            emptyText: '还没有体重记录'
        });

        this.renderLineChart('analytics-sleep', '睡眠时长', healthDates, [
            { name: '睡眠', data: health.sleepHours || [], color: '#8f7cff' }
        ], {
            yName: 'h',
            hasData: this.hasAnyValue(health.sleepHours),
            emptyText: '还没有睡眠记录'
        });

        this.renderBarChart('analytics-steps', '每日步数', healthDates, health.steps || [], {
            yName: '步',
            color: '#ff7a3d',
            hasData: healthDates.length > 0,
            emptyText: '还没有步数记录'
        });

        this.renderBmiGauge('analytics-bmi', healthSummary);

        this.renderBarChart('analytics-net-calories', '净摄入能量', healthDates, health.netCalories || [], {
            yName: 'kcal',
            color: '#e0a447',
            hasData: healthDates.length > 0,
            emptyText: '还没有热量记录'
        });

        this.renderBarChart('analytics-exercise', '锻炼时长', healthDates, health.exerciseMinutes || [], {
            yName: 'min',
            color: '#37c978',
            hasData: healthDates.length > 0,
            emptyText: '还没有锻炼记录'
        });

        this.renderLineChart('analytics-mental', '心情 / 精力 / 压力', healthDates, [
            { name: '心情', data: health.moodLevels || [], color: '#d88ca8' },
            { name: '精力', data: health.energyLevels || [], color: '#d8a33d' },
            { name: '压力', data: health.stressLevels || [], color: '#87a8be' }
        ], {
            yName: '1-5',
            min: 1,
            max: 5,
            hasData: this.hasAnyValue(health.moodLevels) || this.hasAnyValue(health.energyLevels) || this.hasAnyValue(health.stressLevels),
            emptyText: '还没有心理状态记录'
        });
    },

    showLoadError(message) {
        const error = document.getElementById('analytics-error');
        if (error) {
            error.textContent = `Analytics 加载失败：${message}`;
            error.classList.remove('hidden');
        }
        [
            ['analytics-plan-rate', '计划完成趋势'],
            ['analytics-plan-bars', '每日完成数量'],
            ['analytics-plan-mix', 'Build / Quit 比例'],
            ['analytics-weight', '体重趋势'],
            ['analytics-sleep', '睡眠时长'],
            ['analytics-steps', '每日步数'],
            ['analytics-bmi', 'BMI'],
            ['analytics-net-calories', '净摄入能量'],
            ['analytics-exercise', '锻炼时长'],
            ['analytics-mental', '心情 / 精力 / 压力']
        ].forEach(([id, title]) => this.renderEmptyChart(id, title, '数据加载失败'));
    },

    renderLineChart(containerId, title, labels = [], seriesList = [], options = {}) {
        const normalizedSeries = seriesList.map(series => ({
            name: series.name,
            type: 'line',
            smooth: true,
            symbolSize: 7,
            connectNulls: false,
            itemStyle: { color: series.color },
            lineStyle: { width: 3, color: series.color },
            areaStyle: seriesList.length === 1 ? { color: this.makeAreaGradient(series.color) } : undefined,
            data: this.normalizeSeries(series.data)
        }));
        if (!options.hasData || !labels.length) {
            this.renderEmptyChart(containerId, title, options.emptyText || '暂无趋势数据');
            return;
        }
        const chart = this.getChart(containerId);
        if (!chart) return;
        const showLegend = normalizedSeries.length > 1;
        chart.setOption({
            title: this.chartTitle(title, showLegend),
            color: seriesList.map(series => series.color),
            tooltip: { trigger: 'axis', valueFormatter: value => this.formatTooltipValue(value, options.yName) },
            legend: {
                show: showLegend,
                top: 8,
                right: 12,
                itemWidth: 10,
                itemHeight: 10,
                textStyle: { color: '#64748b', fontSize: 12 }
            },
            grid: { left: 18, right: 18, top: showLegend ? 70 : 58, bottom: 28, containLabel: true },
            xAxis: this.categoryAxis(labels),
            yAxis: {
                type: 'value',
                name: options.yName || '',
                min: options.min,
                max: options.max,
                axisLabel: { color: '#64748b' },
                splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.18)' } }
            },
            series: normalizedSeries
        }, true);
    },

    renderBarChart(containerId, title, labels = [], values = [], options = {}) {
        if (!options.hasData || !labels.length) {
            this.renderEmptyChart(containerId, title, options.emptyText || '暂无柱状数据');
            return;
        }
        const chart = this.getChart(containerId);
        if (!chart) return;
        chart.setOption({
            title: this.chartTitle(title),
            color: [options.color || '#ff7a3d'],
            tooltip: { trigger: 'axis', valueFormatter: value => this.formatTooltipValue(value, options.yName) },
            legend: { show: false },
            grid: { left: 18, right: 18, top: 58, bottom: 28, containLabel: true },
            xAxis: this.categoryAxis(labels),
            yAxis: {
                type: 'value',
                name: options.yName || '',
                axisLabel: { color: '#64748b' },
                splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.18)' } }
            },
            series: [{
                name: title,
                type: 'bar',
                barMaxWidth: 34,
                itemStyle: { borderRadius: [8, 8, 3, 3] },
                data: this.normalizeSeries(values).map(value => value ?? 0)
            }]
        }, true);
    },

    renderDonutChart(containerId, title, data, emptyText) {
        const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
        if (!total) {
            this.renderEmptyChart(containerId, title, emptyText);
            return;
        }
        const chart = this.getChart(containerId);
        if (!chart) return;
        chart.setOption({
            title: this.chartTitle(title, true),
            tooltip: { trigger: 'item' },
            legend: {
                top: 8,
                right: 12,
                itemWidth: 10,
                itemHeight: 10,
                textStyle: { color: '#64748b', fontSize: 12 }
            },
            series: [{
                name: title,
                type: 'pie',
                radius: ['44%', '64%'],
                center: ['50%', '58%'],
                avoidLabelOverlap: true,
                label: { formatter: '{b}: {d}%', color: '#334155', fontWeight: 700 },
                data
            }]
        }, true);
    },

    renderBmiGauge(containerId, healthSummary = {}) {
        const bmi = Number(healthSummary.bmi);
        if (!Number.isFinite(bmi)) {
            this.renderEmptyChart(containerId, 'BMI', '暂无身高或体重数据');
            return;
        }
        const chart = this.getChart(containerId);
        if (!chart) return;
        chart.setOption({
            title: this.chartTitle('BMI'),
            tooltip: { formatter: `BMI<br/>${bmi} · ${this.escapeHtml(healthSummary.bmiLabel || '暂无')}` },
            series: [{
                name: 'BMI',
                type: 'gauge',
                min: 12,
                max: 36,
                radius: '82%',
                center: ['50%', '58%'],
                progress: { show: true, width: 12, itemStyle: { color: '#ff7a3d' } },
                axisLine: { lineStyle: { width: 12, color: [[0.38, '#2ea7df'], [0.58, '#37c978'], [0.72, '#e0a447'], [1, '#e9340b']] } },
                axisTick: { show: false },
                splitLine: { length: 8, lineStyle: { color: '#cbd5e1' } },
                axisLabel: { color: '#64748b', distance: 16, fontSize: 10 },
                pointer: { width: 4, length: '58%' },
                detail: {
                    valueAnimation: true,
                    formatter: '{value}',
                    color: '#0f172a',
                    fontSize: 28,
                    fontWeight: 900,
                    offsetCenter: [0, '42%']
                },
                title: {
                    offsetCenter: [0, '68%'],
                    color: '#64748b',
                    fontSize: 12,
                    fontWeight: 800
                },
                data: [{ value: bmi, name: healthSummary.bmiLabel || '暂无' }]
            }]
        }, true);
    },

    renderEmptyChart(containerId, title, text) {
        const chart = this.getChart(containerId);
        if (!chart) {
            const el = document.getElementById(containerId);
            if (el) el.innerHTML = `<div class="chart-empty">${this.escapeHtml(text)}</div>`;
            return;
        }
        chart.setOption({
            title: this.chartTitle(title),
            graphic: {
                type: 'text',
                left: 'center',
                top: 'middle',
                style: {
                    text,
                    fill: '#94a3b8',
                    fontSize: 13,
                    fontWeight: 700,
                    textAlign: 'center'
                }
            },
            xAxis: { show: false },
            yAxis: { show: false },
            series: []
        }, true);
    },

    getChart(containerId) {
        const el = document.getElementById(containerId);
        if (!el) return null;
        if (!window.echarts) {
            el.innerHTML = '<div class="chart-empty">ECharts 本地脚本未加载</div>';
            return null;
        }
        if (this.chartInstances[containerId]) {
            return this.chartInstances[containerId];
        }
        const chart = window.echarts.init(el);
        this.chartInstances[containerId] = chart;
        return chart;
    },

    resizeCharts() {
        Object.values(this.chartInstances).forEach(chart => chart.resize());
    },

    disposeCharts() {
        Object.values(this.chartInstances).forEach(chart => chart.dispose());
        this.chartInstances = {};
    },

    chartTitle(title, hasLegend = false) {
        return {
            text: title,
            left: 12,
            right: hasLegend ? 118 : 12,
            top: 8,
            textStyle: { color: '#0f172a', fontSize: 14, fontWeight: 900, overflow: 'truncate' }
        };
    },

    categoryAxis(labels) {
        return {
            type: 'category',
            data: labels,
            boundaryGap: true,
            axisLabel: {
                color: '#64748b',
                formatter: value => this.shortDateLabel(value)
            },
            axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.35)' } },
            axisTick: { show: false }
        };
    },

    normalizeSeries(values = []) {
        return Array.isArray(values)
            ? values.map(value => {
                if (value === null || value === undefined || value === '') return null;
                const numeric = Number(value);
                return Number.isFinite(numeric) ? numeric : null;
            })
            : [];
    },

    hasAnyValue(values = []) {
        return this.normalizeSeries(values).some(value => value !== null);
    },

    sumValues(values = []) {
        return this.normalizeSeries(values).reduce((sum, value) => sum + (value || 0), 0);
    },

    shortDateLabel(value) {
        const text = String(value || '');
        return text.length >= 10 ? text.slice(5) : text;
    },

    formatTooltipValue(value, unit) {
        if (value === null || value === undefined || value === '') return '--';
        return `${value}${unit ? ` ${unit}` : ''}`;
    },

    makeAreaGradient(color) {
        if (!window.echarts) return color;
        return new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: this.hexToRgba(color, 0.2) },
            { offset: 1, color: this.hexToRgba(color, 0.02) }
        ]);
    },

    hexToRgba(hex, alpha) {
        const value = String(hex || '#ff7a3d').replace('#', '');
        const full = value.length === 3 ? value.split('').map(char => char + char).join('') : value;
        const intValue = parseInt(full, 16);
        const r = (intValue >> 16) & 255;
        const g = (intValue >> 8) & 255;
        const b = intValue & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
};
