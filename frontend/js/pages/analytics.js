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

                <section class="workspace-grid three-col">
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>打卡量</h2>
                            <span>完成天数</span>
                        </div>
                        <div class="chart-panel compact-chart" id="analytics-plan-bars"></div>
                    </article>
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>健康趋势</h2>
                            <span>体重</span>
                        </div>
                        <div class="chart-panel compact-chart" id="analytics-weight"></div>
                    </article>
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>周/月复盘</h2>
                            <span>AI Coach</span>
                        </div>
                        <div class="review-entry-panel">
                            <strong>连续天数、完成率和身体趋势已经准备好</strong>
                            <p>把这些数据带去 AI Coach，让它帮你压缩下一周最关键的一件事。</p>
                            <button class="btn btn-primary" type="button" onclick="AnalyticsPage.openReviewCoach()">开始复盘</button>
                        </div>
                    </article>
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
        }
    },

    renderStats(summary) {
        const stats = [
            { label: '今日完成率', value: `${summary.todayRate || 0}%`, sub: `${summary.todayDone || 0}/${summary.todayTotal || 0}` },
            { label: '最长连续', value: `${summary.maxStreak || 0}天`, sub: 'Streak' },
            { label: 'Build', value: summary.buildPlans || 0, sub: '养成计划' },
            { label: 'Quit', value: summary.quitPlans || 0, sub: '戒除计划' }
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
