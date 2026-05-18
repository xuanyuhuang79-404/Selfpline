const AnalyticsPage = {
    days: 30,
    data: null,

    async render() {
        this.showShell();
        document.getElementById('page-container').innerHTML = `
            <div class="workspace-page analytics-page">
                <section class="workspace-hero analytics-hero">
                    <div>
                        <p class="page-kicker">Analytics</p>
                        <h1>把长期变化看清楚</h1>
                        <p>这里只做统计和复盘入口，不承担编辑、删除或今日打卡。</p>
                    </div>
                    <div class="segmented-control" role="group" aria-label="统计范围">
                        <button type="button" data-days="7" class="${this.days === 7 ? 'active' : ''}">7 天</button>
                        <button type="button" data-days="30" class="${this.days === 30 ? 'active' : ''}">30 天</button>
                    </div>
                </section>

                <section class="workspace-stat-grid" id="analytics-stats">
                    ${this.renderLoadingCards(4)}
                </section>

                <section class="workspace-card analytics-section-title">
                    <div>
                        <h2>计划执行统计</h2>
                        <p>完成率、打卡量和 Build / Quit 结构。</p>
                    </div>
                </section>

                <section class="workspace-grid two-col">
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>计划完成趋势</h2>
                            <span>${this.days} 天</span>
                        </div>
                        <div class="chart-panel" id="analytics-plan-rate"></div>
                    </article>
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>Build / Quit 比例</h2>
                            <span>计划结构</span>
                        </div>
                        <div class="chart-panel donut-panel" id="analytics-plan-mix"></div>
                    </article>
                </section>

                <section class="workspace-card analytics-section-title">
                    <div>
                        <h2>身体指标趋势</h2>
                        <p>来自每日记录与 Profile 健康档案。</p>
                    </div>
                </section>

                <section class="workspace-grid four-col">
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>体重</h2>
                            <span>每日记录</span>
                        </div>
                        <div class="chart-panel compact-chart" id="analytics-weight"></div>
                    </article>
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>睡眠时长</h2>
                            <span>小时</span>
                        </div>
                        <div class="chart-panel compact-chart" id="analytics-sleep"></div>
                    </article>
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>每日步数</h2>
                            <span>活动量</span>
                        </div>
                        <div class="chart-panel compact-chart" id="analytics-steps"></div>
                    </article>
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>BMI</h2>
                            <span>最新体重 + 身高</span>
                        </div>
                        <div class="analytics-bmi-panel" id="analytics-bmi-panel"></div>
                    </article>
                </section>

                <section class="workspace-card analytics-section-title">
                    <div>
                        <h2>能量与运动</h2>
                        <p>净摄入能量 = 摄入卡路里 - 消耗卡路里。</p>
                    </div>
                </section>

                <section class="workspace-grid three-col">
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>净摄入能量</h2>
                            <span>kcal</span>
                        </div>
                        <div class="chart-panel compact-chart" id="analytics-net-calories"></div>
                    </article>
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>锻炼时长</h2>
                            <span>min</span>
                        </div>
                        <div class="chart-panel compact-chart" id="analytics-exercise"></div>
                    </article>
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>打卡量</h2>
                            <span>完成天数</span>
                        </div>
                        <div class="chart-panel compact-chart" id="analytics-plan-bars"></div>
                    </article>
                </section>

                <section class="workspace-card analytics-section-title">
                    <div>
                        <h2>心理状态</h2>
                        <p>心情、精力与压力来自每日状态选择。</p>
                    </div>
                </section>

                <section class="workspace-grid three-col">
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>心情</h2>
                            <span>1-5</span>
                        </div>
                        <div class="chart-panel compact-chart" id="analytics-mood"></div>
                    </article>
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>精力</h2>
                            <span>1-5</span>
                        </div>
                        <div class="chart-panel compact-chart" id="analytics-energy"></div>
                    </article>
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>压力</h2>
                            <span>1-5</span>
                        </div>
                        <div class="chart-panel compact-chart" id="analytics-stress"></div>
                    </article>
                </section>

                <section class="workspace-card">
                    <div class="section-heading">
                        <h2>周/月复盘</h2>
                        <span>AI Coach</span>
                    </div>
                    <div class="review-entry-panel">
                        <strong>连续天数、完成率和身体趋势已经准备好</strong>
                        <p>把这些数据带去 AI Coach，让它帮你压缩下一周最关键的一件事。</p>
                        <button class="btn btn-primary" type="button" onclick="AnalyticsPage.openReviewCoach()">开始复盘</button>
                    </div>
                </section>
            </div>
        `;
        this.bindRangeSwitch();
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

    async loadData() {
        try {
            const result = await apiClient.get(`/analytics/overview?days=${this.days}`);
            this.data = result.data || {};
            this.renderStats(this.data.summary || {});
            this.renderCharts(this.data);
        } catch (e) {
            document.getElementById('analytics-stats').innerHTML = `<div class="workspace-error">Analytics 加载失败：${this.escapeHtml(e.message)}</div>`;
            ChartKit.renderLine('analytics-plan-rate', [], [], { emptyText: '趋势加载失败' });
            ChartKit.renderDonut('analytics-plan-mix', []);
            ChartKit.renderBars('analytics-plan-bars', [], [], { emptyText: '打卡量加载失败' });
            ChartKit.renderLine('analytics-weight', [], [], { emptyText: '健康趋势加载失败' });
            ChartKit.renderLine('analytics-sleep', [], [], { emptyText: '睡眠趋势加载失败' });
            ChartKit.renderLine('analytics-steps', [], [], { emptyText: '步数趋势加载失败' });
            ChartKit.renderLine('analytics-net-calories', [], [], { emptyText: '净摄入加载失败' });
            ChartKit.renderLine('analytics-exercise', [], [], { emptyText: '锻炼趋势加载失败' });
            ChartKit.renderLine('analytics-mood', [], [], { emptyText: '心情趋势加载失败' });
            ChartKit.renderLine('analytics-energy', [], [], { emptyText: '精力趋势加载失败' });
            ChartKit.renderLine('analytics-stress', [], [], { emptyText: '压力趋势加载失败' });
            document.getElementById('analytics-bmi-panel').innerHTML = `<div class="workspace-empty-mini"><strong>BMI 加载失败</strong></div>`;
        }
    },

    renderStats(summary) {
        const healthSummary = this.data?.healthSummary || {};
        const stats = [
            { label: '今日完成率', value: `${summary.todayRate || 0}%`, sub: `${summary.todayDone || 0}/${summary.todayTotal || 0}` },
            { label: '最长连续', value: `${summary.maxStreak || 0}天`, sub: 'Streak' },
            { label: 'BMI', value: healthSummary.bmi ?? '--', sub: healthSummary.bmiLabel || '暂无' },
            { label: '平均步数', value: healthSummary.avgSteps || 0, sub: `${healthSummary.recordCount || 0} 条记录` },
            { label: '平均锻炼', value: `${healthSummary.avgExerciseMinutes || 0}min`, sub: `${healthSummary.recordCount || 0} 条记录` }
        ];
        document.getElementById('analytics-stats').innerHTML = stats.map(item => `
            <article class="workspace-stat-card">
                <span>${item.label}</span>
                <strong>${item.value}</strong>
                <small>${item.sub}</small>
            </article>
        `).join('');
    },

    renderCharts(data) {
        const trend = data.planTrend || {};
        const summary = data.summary || {};
        const health = data.healthTrend || {};
        const healthSummary = data.healthSummary || {};
        ChartKit.renderLine('analytics-plan-rate', trend.dates || [], trend.rate || [], {
            label: '计划完成率',
            color: '#ff7a3d',
            colorTo: '#e9340b',
            emptyText: '还没有计划完成趋势'
        });
        ChartKit.renderDonut('analytics-plan-mix', [
            { label: 'Build', value: summary.buildPlans || 0, color: '#37c978' },
            { label: 'Quit', value: summary.quitPlans || 0, color: '#e9340b' }
        ]);
        ChartKit.renderBars('analytics-plan-bars', trend.dates || [], trend.completed || [], {
            label: '完成打卡数量',
            emptyText: '还没有打卡数据'
        });
        ChartKit.renderLine('analytics-weight', health.dates || [], health.weights || [], {
            label: '体重趋势',
            color: '#2ea7df',
            colorTo: '#7c8bff',
            emptyText: '还没有体重记录'
        });
        ChartKit.renderLine('analytics-sleep', health.dates || [], health.sleepHours || [], {
            label: '睡眠趋势',
            color: '#8f7cff',
            colorTo: '#2ea7df',
            emptyText: '还没有睡眠记录'
        });
        ChartKit.renderLine('analytics-steps', health.dates || [], health.steps || [], {
            label: '步数趋势',
            color: '#ff7a3d',
            colorTo: '#e0a447',
            emptyText: '还没有步数记录'
        });
        ChartKit.renderLine('analytics-net-calories', health.dates || [], health.netCalories || [], {
            label: '净摄入能量',
            color: '#e9340b',
            colorTo: '#ff9c5a',
            emptyText: '还没有热量记录'
        });
        ChartKit.renderLine('analytics-exercise', health.dates || [], health.exerciseMinutes || [], {
            label: '锻炼时长',
            color: '#37c978',
            colorTo: '#2ea7df',
            emptyText: '还没有锻炼记录'
        });
        ChartKit.renderLine('analytics-mood', health.dates || [], health.moodLevels || [], {
            label: '心情状态',
            color: '#d88ca8',
            colorTo: '#ff7ab6',
            emptyText: '还没有心情记录'
        });
        ChartKit.renderLine('analytics-energy', health.dates || [], health.energyLevels || [], {
            label: '精力状态',
            color: '#d8a33d',
            colorTo: '#ff7a3d',
            emptyText: '还没有精力记录'
        });
        ChartKit.renderLine('analytics-stress', health.dates || [], health.stressLevels || [], {
            label: '压力状态',
            color: '#87a8be',
            colorTo: '#e9340b',
            emptyText: '还没有压力记录'
        });
        this.renderBmiPanel(healthSummary);
        this.renderMentalSummary(healthSummary);
    },

    renderBmiPanel(healthSummary) {
        const container = document.getElementById('analytics-bmi-panel');
        if (!container) return;
        container.innerHTML = `
            <div class="analytics-bmi-value">
                <strong>${healthSummary.bmi ?? '--'}</strong>
                <span>${this.escapeHtml(healthSummary.bmiLabel || '暂无')}</span>
                <small>最新体重 ${healthSummary.latestWeight ?? '--'} kg</small>
            </div>
        `;
    },

    renderMentalSummary(healthSummary) {
        const container = document.getElementById('analytics-mental');
        if (!container) return;
        container.innerHTML = `
            <div class="analytics-mental-grid">
                <div><span class="dashboard-icon-tile">🙂</span><strong>${healthSummary.avgMoodLevel || '--'}</strong><em>${healthSummary.moodLabel || '心情'}</em></div>
                <div><span class="dashboard-icon-tile">⚡</span><strong>${healthSummary.avgEnergyLevel || '--'}</strong><em>${healthSummary.energyLabel || '精力'}</em></div>
                <div><span class="dashboard-icon-tile">🧘</span><strong>${healthSummary.avgStressLevel || '--'}</strong><em>${healthSummary.stressLabel || '压力'}</em></div>
            </div>
        `;
    },

    openReviewCoach() {
        const summary = this.data?.summary || {};
        localStorage.setItem('selfpline_analytics_review_context', JSON.stringify({
            days: this.days,
            todayRate: summary.todayRate || 0,
            maxStreak: summary.maxStreak || 0,
            activePlans: summary.activePlans || 0
        }));
        PageRouter.navigate('ai-coach', { sceneKey: 'coach_professional_planner' });
    },

    renderLoadingCards(count) {
        return Array.from({ length: count }).map(() => '<article class="workspace-stat-card loading-card"><span></span><strong></strong><small></small></article>').join('');
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
};
