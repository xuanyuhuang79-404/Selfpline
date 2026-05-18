const DashboardPage = {
    analytics: null,
    cards: [],
    currentPlanIndex: 0,

    async render() {
        this.showShell();
        document.getElementById('page-container').innerHTML = `
            <div class="workspace-page dashboard-page">
                <section class="dashboard-executive-hero">
                    <div class="dashboard-hero-copy">
                        <p class="page-kicker">Selfpline Dashboard</p>
                        <h1>今日执行总览</h1>
                        <p id="dashboard-hero-summary">正在读取今天的计划、记录和健康状态。</p>
                        <div class="dashboard-hero-actions">
                            <button class="btn btn-primary" type="button" onclick="PageRouter.navigate('today')">进入 Today</button>
                            <button class="workspace-link-btn" type="button" onclick="PageRouter.navigate('records')">记录今日状态</button>
                        </div>
                    </div>
                    <div class="dashboard-hero-status">
                        <span>今日完成率</span>
                        <strong id="dashboard-hero-rate">--%</strong>
                        <small id="dashboard-hero-count">--/--</small>
                        <div class="today-progress-track"><span id="dashboard-hero-fill"></span></div>
                    </div>
                </section>

                <section class="workspace-stat-grid" id="dashboard-stats">
                    ${this.renderLoadingCards(4)}
                </section>

                <section class="dashboard-work-grid">
                    <article class="workspace-card dashboard-today-center">
                        <div class="section-heading">
                            <h2>今日执行中心</h2>
                            <span id="dashboard-today-label">加载中</span>
                        </div>
                        <div class="today-progress-track"><span id="dashboard-today-fill"></span></div>
                        <div id="dashboard-today-list" class="dashboard-task-list">
                            <div class="panel-loading">加载中...</div>
                        </div>
                    </article>

                    <article class="workspace-card dashboard-ai-card">
                        <div class="section-heading">
                            <h2>AI 今日建议</h2>
                            <span>下一步</span>
                        </div>
                        <div id="dashboard-ai-suggestion" class="dashboard-ai-suggestion">
                            <div class="panel-loading">加载中...</div>
                        </div>
                    </article>
                </section>

                <section class="dashboard-health-grid">
                    <article class="workspace-card dashboard-record-status">
                        <div class="section-heading">
                            <h2>今日记录状态</h2>
                            <span>Records</span>
                        </div>
                        <div id="dashboard-record-status">
                            <div class="panel-loading">加载中...</div>
                        </div>
                    </article>

                    <article class="workspace-card dashboard-recent-records">
                        <div class="section-heading">
                            <h2>最近身体记录</h2>
                            <span>最近 3 条</span>
                        </div>
                        <div id="dashboard-recent-records" class="dashboard-record-list">
                            <div class="panel-loading">加载中...</div>
                        </div>
                    </article>
                </section>

                <section class="workspace-card dashboard-plan-summary">
                    <div class="section-heading">
                        <h2>计划健康度</h2>
                        <span>管理摘要</span>
                    </div>
                    <div id="dashboard-plan-summary" class="dashboard-plan-summary-body">
                        <div class="panel-loading">加载中...</div>
                    </div>
                </section>

                <section class="dashboard-community-banner" id="dashboard-community-banner">
                    <div class="panel-loading">加载中...</div>
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
                apiClient.get('/analytics/overview?days=30'),
                apiClient.get('/plan/dashboard')
            ]);
            this.analytics = analyticsResult.data || {};
            this.cards = Array.isArray(cardsResult.data) ? cardsResult.data : [];
            const summary = this.analytics.summary || {};
            const healthSummary = this.analytics.healthSummary || {};
            const todayRecord = this.analytics.todayRecord || {};

            this.renderHero(summary, todayRecord);
            this.renderStats(summary, healthSummary, todayRecord);
            this.renderToday(this.cards, summary);
            this.renderAiSuggestion(summary, todayRecord, healthSummary);
            this.renderTodayRecord(todayRecord);
            this.renderRecentRecords(this.analytics.recentRecords || []);
            this.renderPlanSummary(summary);
            this.renderCommunitySummary(this.analytics.community || {});
        } catch (e) {
            const message = this.escapeHtml(e.message || '请稍后重试');
            document.getElementById('dashboard-stats').innerHTML = `<div class="workspace-error">Dashboard 加载失败：${message}</div>`;
            document.getElementById('dashboard-today-list').innerHTML = `<div class="workspace-empty-mini"><strong>今日执行加载失败</strong><span>${message}</span></div>`;
            document.getElementById('dashboard-ai-suggestion').innerHTML = `<div class="workspace-empty-mini"><strong>暂时无法生成建议</strong><span>${message}</span></div>`;
            document.getElementById('dashboard-record-status').innerHTML = `<div class="workspace-empty-mini"><strong>记录状态加载失败</strong></div>`;
            document.getElementById('dashboard-recent-records').innerHTML = `<div class="workspace-empty-mini"><strong>最近记录加载失败</strong></div>`;
            document.getElementById('dashboard-plan-summary').innerHTML = `<div class="workspace-empty-mini"><strong>计划摘要加载失败</strong></div>`;
            document.getElementById('dashboard-community-banner').innerHTML = `<strong>Community 暂时不可用</strong><span>${message}</span>`;
        }
    },

    renderHero(summary, todayRecord) {
        const todayTotal = Number(summary.todayTotal || 0);
        const todayDone = Math.min(Number(summary.todayDone || 0), todayTotal);
        const todayRate = todayTotal ? Math.min(100, Math.round(todayDone / todayTotal * 100)) : 0;
        const remaining = Math.max(todayTotal - todayDone, 0);
        const recorded = Boolean(todayRecord.healthRecordExists);
        const summaryEl = document.getElementById('dashboard-hero-summary');
        const rateEl = document.getElementById('dashboard-hero-rate');
        const countEl = document.getElementById('dashboard-hero-count');
        const fillEl = document.getElementById('dashboard-hero-fill');

        if (summaryEl) {
            summaryEl.textContent = todayTotal
                ? `今天还有 ${remaining} 个计划待完成，今日记录${recorded ? '已记录' : '未记录'}。先处理最小一步，再决定是否需要 AI 帮忙。`
                : `今天还没有执行计划。可以先创建一个 Build / Quit 计划，或记录一条身体状态建立基线。`;
        }
        if (rateEl) rateEl.textContent = `${todayRate}%`;
        if (countEl) countEl.textContent = todayTotal ? `${todayDone}/${todayTotal}` : '暂无计划';
        if (fillEl) fillEl.style.width = `${todayRate}%`;
    },

    renderStats(summary, healthSummary, todayRecord) {
        const todayTotal = Number(summary.todayTotal || 0);
        const todayDone = Math.min(Number(summary.todayDone || 0), todayTotal);
        const todayRate = todayTotal ? Math.min(100, Math.round(todayDone / todayTotal * 100)) : 0;
        const stats = [
            { label: '今日完成率', value: `${todayRate}%`, sub: todayTotal ? `${todayDone}/${todayTotal}` : '暂无计划', tone: 'primary' },
            { label: '进行中计划', value: summary.activePlans || 0, sub: 'Active', tone: 'info' },
            { label: '今日记录', value: todayRecord.healthRecordExists ? '已记录' : '未记录', sub: todayRecord.healthRecordExists ? `${todayRecord.steps ?? '--'} 步` : 'Records', tone: todayRecord.healthRecordExists ? 'success' : 'warning' },
            { label: '平均步数', value: healthSummary.avgSteps || 0, sub: `${healthSummary.recordCount || 0} 条记录`, tone: 'neutral' }
        ];
        document.getElementById('dashboard-stats').innerHTML = stats.map(item => `
            <article class="workspace-stat-card dashboard-stat-card ${item.tone}">
                <span>${item.label}</span>
                <strong>${item.value}</strong>
                <small>${item.sub}</small>
            </article>
        `).join('');
    },

    renderToday(cards, summary) {
        const total = cards.length;
        const done = Math.min(cards.filter(card => card.todayCompleted).length, total);
        const percent = total ? Math.round(done / total * 100) : 0;
        const label = document.getElementById('dashboard-today-label');
        const fill = document.getElementById('dashboard-today-fill');
        const container = document.getElementById('dashboard-today-list');
        if (label) label.textContent = total ? `${done}/${total} · ${percent}%` : '暂无计划';
        if (fill) fill.style.width = `${percent}%`;
        if (!container) return;

        if (!cards.length) {
            container.innerHTML = `
                <div class="workspace-empty-mini">
                    <strong>今天还没有计划</strong>
                    <span>先创建一个计划，再从 Today 开始执行。</span>
                    <button class="workspace-link-btn" type="button" onclick="PageRouter.navigate('create-plan')">创建计划</button>
                </div>
            `;
            return;
        }

        const sorted = [...cards].sort((a, b) => Number(a.todayCompleted) - Number(b.todayCompleted));
        this.cards = sorted;
        this.currentPlanIndex = Math.min(Math.max(this.currentPlanIndex, 0), sorted.length - 1);
        container.innerHTML = this.renderTodayPlanBanner(sorted[this.currentPlanIndex], sorted.length) + `
            <button class="workspace-link-btn dashboard-full-width" type="button" onclick="PageRouter.navigate('today')">查看 Today</button>
        `;
    },

    renderTodayPlanBanner(card, total) {
        const directionLabel = Number(card.planDirection) === 2 ? 'Quit' : 'Build';
        const directionClass = Number(card.planDirection) === 2 ? 'quit' : 'build';
        const completed = Boolean(card.todayCompleted);
        const disabled = total <= 1 ? 'disabled' : '';
        return `
            <div class="dashboard-plan-carousel">
                <button class="dashboard-carousel-btn" type="button" aria-label="上一个计划" onclick="DashboardPage.switchTodayPlan(-1)" ${disabled}>‹</button>
                <button class="dashboard-plan-banner ${directionClass} ${completed ? 'done' : ''}" type="button" onclick="PageRouter.navigate('plan-detail', { planId: ${card.planId} })">
                    <span class="dashboard-icon-tile">${this.escapeHtml(card.icon || '📋')}</span>
                    <span class="dashboard-task-copy">
                        <strong>${this.escapeHtml(card.shortName || card.targetName || '未命名计划')}</strong>
                        <small>${directionLabel} · ${completed ? '今日已完成' : '今日待完成'} · 连续 ${card.streakDays || 0} 天</small>
                    </span>
                    <em>${completed ? '已完成' : '进入详情'}</em>
                </button>
                <button class="dashboard-carousel-btn" type="button" aria-label="下一个计划" onclick="DashboardPage.switchTodayPlan(1)" ${disabled}>›</button>
                <span class="dashboard-carousel-count">${this.currentPlanIndex + 1} / ${total}</span>
            </div>
        `;
    },

    switchTodayPlan(delta) {
        if (!this.cards.length) return;
        const total = this.cards.length;
        this.currentPlanIndex = (this.currentPlanIndex + delta + total) % total;
        const container = document.getElementById('dashboard-today-list');
        if (!container) return;
        container.innerHTML = this.renderTodayPlanBanner(this.cards[this.currentPlanIndex], total) + `
            <button class="workspace-link-btn dashboard-full-width" type="button" onclick="PageRouter.navigate('today')">查看 Today</button>
        `;
    },

    renderAiSuggestion(summary, todayRecord, healthSummary) {
        const container = document.getElementById('dashboard-ai-suggestion');
        if (!container) return;
        const total = Number(summary.todayTotal || 0);
        const done = Math.min(Number(summary.todayDone || 0), total);
        const remaining = Math.max(total - done, 0);
        const recorded = Boolean(todayRecord.healthRecordExists);

        let title = '先完成一个最小行动';
        let body = '把今天最容易推进的一项打开，完成后再决定是否加码。';
        let action = { label: '进入 Today', page: 'today' };

        if (!total) {
            title = '先建立一个可执行计划';
            body = '用 AI 创建一个足够小的 Build / Quit 计划，让 Dashboard 明天有可追踪对象。';
            action = { label: '创建计划', page: 'create-plan' };
        } else if (!recorded) {
            title = '先记录今日身体状态';
            body = '步数、锻炼时长、心情、精力和压力会影响后续建议。先记录，再让 AI 给你更贴近今天的建议。';
            action = { label: '填写今日记录', page: 'records' };
        } else if (remaining === 0) {
            title = '今天执行已经收稳';
            body = `可以把 ${healthSummary.avgSteps || 0} 步、心情 ${healthSummary.moodLabel || '暂无'} 这类信号带去复盘，决定明天是否调整节奏。`;
            action = { label: '开始复盘', page: 'ai-coach' };
        }

        container.innerHTML = `
            <div class="dashboard-ai-copy">
                <span class="dashboard-icon-tile">✨</span>
                <div>
                    <strong>${this.escapeHtml(title)}</strong>
                    <p>${this.escapeHtml(body)}</p>
                </div>
            </div>
            <button class="btn btn-primary" type="button" onclick="PageRouter.navigate('${action.page}')">${this.escapeHtml(action.label)}</button>
        `;
    },

    renderTodayRecord(record) {
        const container = document.getElementById('dashboard-record-status');
        if (!container) return;
        if (!record.healthRecordExists) {
            container.innerHTML = `
                <div class="workspace-empty-mini">
                    <strong>今日记录未记录</strong>
                    <span>步数、锻炼时长、心情、精力、压力会用于健康指标和 AI 建议。</span>
                    <button class="workspace-link-btn" type="button" onclick="PageRouter.navigate('records')">填写今日记录</button>
                </div>
            `;
            return;
        }
        container.innerHTML = `
            <div class="dashboard-record-grid">
                ${this.renderRecordMetric('步数', record.steps ?? '--', '步', '👟')}
                ${this.renderRecordMetric('锻炼', record.exerciseMinutes ?? '--', 'min', '🏋️')}
                ${this.renderRecordMetric('心情', this.formatStateLabel('moodLevel', record.moodLevel), '', '🙂')}
                ${this.renderRecordMetric('精力', this.formatStateLabel('energyLevel', record.energyLevel), '', '⚡')}
                ${this.renderRecordMetric('压力', this.formatStateLabel('stressLevel', record.stressLevel), '', '🧘')}
            </div>
            <button class="workspace-link-btn dashboard-full-width" type="button" onclick="PageRouter.navigate('records')">查看 Records</button>
        `;
    },

    renderRecentRecords(records) {
        const container = document.getElementById('dashboard-recent-records');
        if (!container) return;
        if (!records.length) {
            container.innerHTML = `
                <div class="workspace-empty-mini">
                    <strong>还没有身体记录</strong>
                    <span>提交今日记录后，这里会显示最近 3 条变化。</span>
                </div>
            `;
            return;
        }
        container.innerHTML = records.map(record => `
            <article class="dashboard-record-row">
                <span class="dashboard-icon-tile">📒</span>
                <div>
                    <strong>${this.formatDisplayDate(record.recordDate)}</strong>
                    <small>${record.steps ?? '--'} 步 · 锻炼 ${record.exerciseMinutes ?? '--'}min · 睡眠 ${record.sleepHours ?? '--'}h</small>
                </div>
            </article>
        `).join('');
    },

    renderPlanSummary(summary) {
        const container = document.getElementById('dashboard-plan-summary');
        if (!container) return;
        container.innerHTML = `
            <div class="dashboard-summary-metrics">
                <div><strong>${summary.activePlans || 0}</strong><span>进行中</span></div>
                <div><strong>${summary.endedPlans ?? summary.archivedPlans ?? 0}</strong><span>已结束</span></div>
                <div><strong>${summary.reviewPlans || 0}</strong><span>待复盘</span></div>
                <div><strong>${summary.maxStreak || 0}</strong><span>最长连续天数</span></div>
            </div>
            <div class="dashboard-summary-actions">
                <button class="workspace-link-btn" type="button" onclick="PageRouter.navigate('plans')">管理 Plans</button>
                <button class="workspace-link-btn" type="button" onclick="PageRouter.navigate('analytics')">查看 Analytics</button>
            </div>
        `;
    },

    renderCommunitySummary(community) {
        const container = document.getElementById('dashboard-community-banner');
        if (!container) return;
        container.innerHTML = `
            <div>
                <span class="dashboard-icon-tile">🌐</span>
                <strong>Community</strong>
                <p>${community.totalPosts || 0} 条动态 · 我的发布 ${community.myPosts || 0} 条</p>
            </div>
            <button class="workspace-link-btn" type="button" onclick="PageRouter.navigate('community')">进入社区</button>
        `;
    },

    renderRecordMetric(label, value, unit, icon) {
        return `
            <div class="dashboard-record-metric">
                <span class="dashboard-icon-tile">${icon}</span>
                <strong>${this.escapeHtml(String(value))}<small>${unit}</small></strong>
                <em>${this.escapeHtml(label)}</em>
            </div>
        `;
    },

    renderLoadingCards(count) {
        return Array.from({ length: count }).map(() => '<article class="workspace-stat-card loading-card"><span></span><strong></strong><small></small></article>').join('');
    },

    formatDisplayDate(dateValue) {
        if (!dateValue) return '--';
        return this.escapeHtml(String(dateValue).slice(5) || '--');
    },

    formatStateLabel(key, value) {
        const maps = {
            moodLevel: { 1: '低落', 2: '平淡', 3: '平稳', 4: '愉快', 5: '很好' },
            energyLevel: { 1: '很低', 2: '偏低', 3: '够用', 4: '充足', 5: '高能' },
            stressLevel: { 1: '很低', 2: '较低', 3: '可控', 4: '偏高', 5: '很高' }
        };
        return maps[key]?.[Number(value)] || '--';
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
};
