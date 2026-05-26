// 计划详情页：摘要、今日打卡、最近执行概览与完整计划
const PlanDetailPage = {
    planId: null,
    planData: null,
    trackingMode: 1,
    planContentExpanded: false,

    async render(params = {}) {
        if (!params.planId) {
            params = PageRouter.getParams();
        }
        this.planId = params.planId;
        this.planContentExpanded = false;
        document.getElementById('top-nav').classList.remove('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');
        document.getElementById('fab-add-habit').classList.add('hidden');

        if (!this.planId) {
            document.getElementById('page-container').innerHTML = `
                <div class="plan-detail-shell">
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <div class="empty-title">未找到计划</div>
                        <div class="empty-desc">请从首页选择一个计划进入详情页。</div>
                        <button class="empty-cta" onclick="PageRouter.navigate('plans')">返回 Plans</button>
                    </div>
                </div>
            `;
            return;
        }

        document.getElementById('page-container').innerHTML = `
            <div class="plan-detail-shell">
                <div id="plan-detail-content" class="plan-detail-content loading">加载中...</div>
            </div>
        `;

        await this.loadDetail();
    },

    async loadDetail() {
        try {
            const result = await apiClient.get(`/plan/${this.planId}/detail`);
            this.planData = result.data || {};
            this.trackingMode = 1;
            this.renderContent();
            await this.loadTodayLog();
        } catch (e) {
            Toast.show('加载失败: ' + e.message);
            const content = document.getElementById('plan-detail-content');
            if (content) {
                content.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">😞</div>
                        <div class="empty-title">计划加载失败</div>
                        <div class="empty-desc">${this.escapeHtml(e.message || '请稍后重试')}</div>
                        <button class="empty-cta" onclick="PlanDetailPage.render(PageRouter.getParams())">重试</button>
                    </div>
                `;
            }
        }
    },

    renderContent() {
        const p = this.planData || {};
        const shortName = p.shortName || p.targetName || '未命名计划';
        const directionClass = p.planDirection === 2 ? 'quit' : 'build';
        const directionLabel = p.planDirection === 2 ? 'Quit · 戒除' : 'Build · 养成';

        document.getElementById('plan-detail-content').innerHTML = `
            <div class="detail-back-row">
                <button type="button" onclick="history.back()">← 返回</button>
            </div>

            <section class="plan-summary-card ${directionClass}">
                <div class="plan-summary-main">
                    <div class="plan-icon">${this.escapeHtml(p.icon || '📋')}</div>
                    <div class="plan-summary-copy">
                        <span class="direction-pill">${directionLabel}</span>
                        <h1>${this.escapeHtml(shortName)}</h1>
                        ${p.targetName && p.targetName !== shortName ? `<p>${this.escapeHtml(p.targetName)}</p>` : ''}
                    </div>
                </div>
                <div class="plan-summary-stats" id="plan-summary-stats">
                    ${this.renderSummaryStats()}
                </div>
            </section>

            <div class="plan-detail-grid">
                <section class="daily-record-section today-check-section">
                    <div class="section-head-tight">
                        <div>
                            <h3>今日打卡</h3>
                            <p>只记录今天是否完成，需要调整时可随时取消。</p>
                        </div>
                    </div>
                    <div class="tracker-component" id="trackerContainer"></div>
                </section>

                <section class="daily-record-section recent-overview-section">
                    <div class="section-head-tight">
                        <div>
                            <h3>最近执行概览</h3>
                            <p>过去 7 天完成状态一眼看清。</p>
                        </div>
                    </div>
                    <div id="recent-overview-body">
                        ${this.renderRecentOverviewBody()}
                    </div>
                </section>

                <section class="daily-record-section plan-content-section" id="plan-content-section">
                    ${this.renderPlanContentSection()}
                </section>
            </div>
        `;

        DailyTracker.init(this.planId, this.trackingMode, { isCompleted: Boolean(p.todayCompleted) });
    },

    renderSummaryStats() {
        const p = this.planData || {};
        const completionRate = Number.isFinite(Number(p.completionRate))
            ? Math.min(100, Math.max(0, Number(p.completionRate)))
            : 0;
        return `
            <div>
                <span>连续</span>
                <strong>${p.streakDays || 0}<small>天</small></strong>
            </div>
            <div>
                <span>完成率</span>
                <strong>${completionRate.toFixed(0)}<small>%</small></strong>
            </div>
            <div>
                <span>今日</span>
                <strong>${p.todayCompleted ? '已完成' : '待完成'}</strong>
            </div>
        `;
    },

    renderRecentOverviewBody() {
        const days = this.getRecentSevenDays();
        const logMap = new Map((this.planData?.recentLogs || []).map(log => [log.recordDate, log]));
        const completedCount = days.filter(date => Boolean(logMap.get(date)?.isCompleted)).length;
        return `
            <div class="recent-dot-row" aria-label="最近 7 天执行状态">
                ${days.map(date => this.renderRecentDay(date, logMap.get(date))).join('')}
            </div>
            <div class="recent-overview-meta">
                <strong>${completedCount}/7</strong>
                <span>天完成</span>
            </div>
        `;
    },

    renderRecentDay(date, log) {
        const completed = Boolean(log?.isCompleted);
        const hasLog = Boolean(log);
        const className = completed ? 'done' : (hasLog ? 'missed' : 'empty');
        const label = this.shortDateLabel(date);
        const title = completed ? '已完成' : (hasLog ? '未完成' : '未记录');
        return `
            <div class="recent-day ${className}" title="${date} ${title}">
                <span></span>
                <small>${label}</small>
            </div>
        `;
    },

    renderPlanContentSection() {
        const content = this.planData?.planContent || '暂无详细计划内容';
        const expandedClass = this.planContentExpanded ? 'expanded' : 'collapsed';
        return `
            <div class="section-head-tight">
                <div>
                    <h3>完整计划</h3>
                    <p>默认收起，展开后查看全部执行细节。</p>
                </div>
            </div>
            <div class="plan-content-frame ${expandedClass}">
                <div class="plan-content-text">${this.escapeHtml(content).replace(/\n/g, '<br>')}</div>
            </div>
            <button class="plan-content-toggle" type="button" onclick="PlanDetailPage.togglePlanContent()">
                ${this.planContentExpanded ? '收起' : '展开完整计划'}
            </button>
        `;
    },

    async loadTodayLog() {
        const trackerContainer = document.getElementById('trackerContainer') || document.getElementById('tracker-container');
        if (!trackerContainer) return;

        const today = this.getLocalDateString(new Date());
        try {
            const result = await apiClient.get(`/plan/${this.planId}/daily-logs?startDate=${today}&endDate=${today}`);
            const logs = result.data || [];
            const existingLog = logs.length > 0 ? logs[0] : null;
            if (existingLog) {
                this.upsertRecentLog(today, existingLog.isCompleted);
                this.planData.todayCompleted = Boolean(existingLog.isCompleted);
            }
            DailyTracker.init(this.planId, 1, existingLog);
        } catch (e) {
            DailyTracker.init(this.planId, 1, { isCompleted: Boolean(this.planData?.todayCompleted) });
        }
    },

    handleTodayCheckChanged(planId, isCompleted) {
        if (String(planId) !== String(this.planId) || !this.planData) return;
        const today = this.getLocalDateString(new Date());
        this.planData.todayCompleted = Boolean(isCompleted);
        this.upsertRecentLog(today, isCompleted);

        const stats = document.getElementById('plan-summary-stats');
        if (stats) stats.innerHTML = this.renderSummaryStats();

        const overview = document.getElementById('recent-overview-body');
        if (overview) overview.innerHTML = this.renderRecentOverviewBody();
    },

    togglePlanContent() {
        this.planContentExpanded = !this.planContentExpanded;
        const section = document.getElementById('plan-content-section');
        if (section) section.innerHTML = this.renderPlanContentSection();
    },

    upsertRecentLog(recordDate, isCompleted) {
        if (!this.planData) return;
        if (!Array.isArray(this.planData.recentLogs)) {
            this.planData.recentLogs = [];
        }
        const existing = this.planData.recentLogs.find(log => log.recordDate === recordDate);
        if (existing) {
            existing.isCompleted = Boolean(isCompleted);
            existing.actualValue = isCompleted ? 1 : 0;
            existing.targetValue = 1;
        } else {
            this.planData.recentLogs.push({
                recordDate,
                isCompleted: Boolean(isCompleted),
                actualValue: isCompleted ? 1 : 0,
                targetValue: 1
            });
        }
    },

    getRecentSevenDays() {
        const today = new Date();
        return Array.from({ length: 7 }, (_, index) => {
            const date = new Date(today);
            date.setDate(today.getDate() - (6 - index));
            return this.getLocalDateString(date);
        });
    },

    getLocalDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    shortDateLabel(date) {
        const text = String(date || '');
        return text.length >= 10 ? text.slice(5).replace('-', '/') : text;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
};
