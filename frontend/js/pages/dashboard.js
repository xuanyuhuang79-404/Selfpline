const DashboardPage = {
    async render() {
        this.showShell();
        document.getElementById('page-container').innerHTML = `
            <div class="workspace-page dashboard-page">
                <section class="workspace-hero dashboard-hero">
                    <div>
                        <p class="page-kicker">Selfpline Dashboard</p>
                        <h1>看清状态，再安排今天</h1>
                        <p>这里是你的自律工作台总览：计划推进、今日完成、身体趋势、AI 建议和社区现场都会汇总在这里。</p>
                    </div>
                    <button class="btn btn-primary workspace-hero-action" type="button" onclick="PageRouter.navigate('today')">进入 Today</button>
                </section>
                <section class="workspace-stat-grid" id="dashboard-stats">
                    ${this.renderLoadingCards(4)}
                </section>
                <section class="workspace-grid two-col">
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>近 7 天计划完成趋势</h2>
                            <span>完成率</span>
                        </div>
                        <div class="chart-panel" id="dashboard-plan-chart"></div>
                    </article>
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>Build / Quit 结构</h2>
                            <span>计划分布</span>
                        </div>
                        <div class="chart-panel donut-panel" id="dashboard-plan-donut"></div>
                    </article>
                </section>
                <section class="workspace-grid four-col">
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>今日执行</h2>
                            <span id="dashboard-today-label">--</span>
                        </div>
                        <div id="dashboard-today-list" class="compact-list"><div class="panel-loading">加载中...</div></div>
                    </article>
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>身体趋势</h2>
                            <span>最近记录</span>
                        </div>
                        <div class="chart-panel compact-chart" id="dashboard-health-chart"></div>
                    </article>
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>AI 今日建议</h2>
                            <span>快速入口</span>
                        </div>
                        <div class="ai-workspace-summary">
                            <strong>先完成一个最小行动</strong>
                            <p>如果今天阻力很大，让 AI 指导师帮你把目标压缩到一个可执行动作。</p>
                            <button class="btn btn-primary" type="button" onclick="PageRouter.navigate('ai-coach')">打开 AI Coach</button>
                        </div>
                    </article>
                    <article class="workspace-card">
                        <div class="section-heading">
                            <h2>社区摘要</h2>
                            <span>Community</span>
                        </div>
                        <div class="community-summary-panel" id="dashboard-community-summary">
                            <div class="panel-loading">加载中...</div>
                        </div>
                    </article>
                </section>
            </div>
        `;
        await this.loadData();
    },

    showShell() {
        document.getElementById('top-nav').classList.remove('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');
        document.getElementById('fab-add-habit').classList.add('hidden');
    },

    async loadData() {
        try {
            const [analyticsResult, cardsResult] = await Promise.all([
                apiClient.get('/analytics/overview?days=7'),
                apiClient.get('/plan/dashboard')
            ]);
            const analytics = analyticsResult.data || {};
            const cards = cardsResult.data || [];
            this.renderStats(analytics.summary || {});
            this.renderToday(cards);
            const trend = analytics.planTrend || {};
            ChartKit.renderLine('dashboard-plan-chart', trend.dates || [], trend.rate || [], {
                label: '近 30 天完成率',
                color: '#ff7a3d',
                colorTo: '#e9340b',
                emptyText: '还没有计划完成趋势'
            });
            const summary = analytics.summary || {};
            ChartKit.renderDonut('dashboard-plan-donut', [
                { label: 'Build', value: summary.buildPlans || 0, color: '#37c978' },
                { label: 'Quit', value: summary.quitPlans || 0, color: '#e9340b' }
            ]);
            const health = analytics.healthTrend || {};
            ChartKit.renderLine('dashboard-health-chart', health.dates || [], health.weights || [], {
                label: '体重趋势',
                color: '#2ea7df',
                colorTo: '#7c8bff',
                emptyText: '还没有身体记录'
            });
            this.renderCommunitySummary(analytics.community || {});
        } catch (e) {
            document.getElementById('dashboard-stats').innerHTML = `<div class="workspace-error">Dashboard 加载失败：${this.escapeHtml(e.message)}</div>`;
            ChartKit.renderLine('dashboard-plan-chart', [], [], { emptyText: '趋势加载失败' });
            ChartKit.renderDonut('dashboard-plan-donut', []);
            ChartKit.renderLine('dashboard-health-chart', [], [], { emptyText: '趋势加载失败' });
            document.getElementById('dashboard-today-list').innerHTML = `<div class="empty-state"><div class="empty-title">今日计划加载失败</div></div>`;
            document.getElementById('dashboard-community-summary').innerHTML = `<div class="workspace-empty-mini"><strong>社区摘要加载失败</strong></div>`;
        }
    },

    renderStats(summary) {
        const stats = [
            { label: '今日完成率', value: `${summary.todayRate || 0}%`, sub: `${summary.todayDone || 0}/${summary.todayTotal || 0}` },
            { label: '进行中计划', value: summary.activePlans || 0, sub: 'Active' },
            { label: '最长连续', value: `${summary.maxStreak || 0}天`, sub: 'Streak' },
            { label: '归档计划', value: summary.archivedPlans || 0, sub: 'Archived' }
        ];
        document.getElementById('dashboard-stats').innerHTML = stats.map(item => `
            <article class="workspace-stat-card">
                <span>${item.label}</span>
                <strong>${item.value}</strong>
                <small>${item.sub}</small>
            </article>
        `).join('');
    },

    renderToday(cards) {
        const done = cards.filter(card => card.todayCompleted).length;
        const label = document.getElementById('dashboard-today-label');
        if (label) label.textContent = cards.length ? `${done}/${cards.length}` : '暂无';
        const container = document.getElementById('dashboard-today-list');
        if (!cards.length) {
            container.innerHTML = `
                <div class="workspace-empty-mini">
                    <strong>今天还没有计划</strong>
                    <span>先创建一个计划，再从 Today 开始执行。</span>
                    <button type="button" onclick="PageRouter.navigate('create-plan')">创建计划</button>
                </div>
            `;
            return;
        }
        container.innerHTML = cards.slice(0, 5).map(card => `
            <button class="compact-plan-row" type="button" onclick="PageRouter.navigate('plan-detail', { planId: ${card.planId} })">
                <span>${this.escapeHtml(card.icon || '📋')}</span>
                <strong>${this.escapeHtml(card.shortName || card.targetName || '未命名计划')}</strong>
                <em>${card.todayCompleted ? '已完成' : '待完成'}</em>
            </button>
        `).join('') + `<button class="workspace-link-btn" type="button" onclick="PageRouter.navigate('today')">查看 Today</button>`;
    },

    renderCommunitySummary(community) {
        const container = document.getElementById('dashboard-community-summary');
        if (!container) return;
        const totalPosts = community.totalPosts || 0;
        const myPosts = community.myPosts || 0;
        container.innerHTML = `
            <div class="workspace-mini-stats">
                <div><strong>${totalPosts}</strong><span>全部动态</span></div>
                <div><strong>${myPosts}</strong><span>我的发布</span></div>
            </div>
            <button class="workspace-link-btn" type="button" onclick="PageRouter.navigate('community')">进入 Community</button>
        `;
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
