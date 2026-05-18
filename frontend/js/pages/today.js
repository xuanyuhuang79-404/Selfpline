const TodayPage = {
    async render() {
        this.showShell();
        document.getElementById('page-container').innerHTML = `
            <div class="workspace-page today-page">
                <section class="workspace-hero today-hero">
                    <div>
                        <p class="page-kicker">Today</p>
                        <h1>今天只推进今天</h1>
                        <p>这里不看过往日期，不做复杂管理。把今天的计划完成、复盘一句，再继续生活。</p>
                    </div>
                    <button class="btn btn-primary workspace-hero-action" type="button" onclick="PageRouter.navigate('create-plan')">创建计划</button>
                </section>
                <section class="workspace-grid two-col today-main-grid">
                    <article class="workspace-card today-task-card">
                        <div class="section-heading">
                            <h2>今日计划</h2>
                            <span id="today-progress-label">加载中</span>
                        </div>
                        <div class="today-progress-track"><span id="today-progress-fill"></span></div>
                        <div class="habit-cards-list today-card-list" id="today-plan-list">
                            <div class="panel-loading">加载中...</div>
                        </div>
                    </article>
                    <aside class="workspace-side-stack">
                        <article class="workspace-card">
                            <div class="section-heading">
                                <h2>今日复盘</h2>
                                <span>轻量记录</span>
                            </div>
                            <textarea class="workspace-textarea" id="today-review-text" placeholder="今天最大的阻力/最有效的小动作是什么？"></textarea>
                            <button class="btn btn-primary" type="button" onclick="TodayPage.openCoachReview()">让 AI 帮我复盘</button>
                        </article>
                        <article class="workspace-card">
                            <div class="section-heading">
                                <h2>身体记录</h2>
                                <span>Records</span>
                            </div>
                            <p class="workspace-muted">身体状态和日记单独记录，避免和计划打卡混在一起。</p>
                            <button class="workspace-link-btn" type="button" onclick="PageRouter.navigate('records')">填写今日记录</button>
                        </article>
                    </aside>
                </section>
            </div>
        `;
        await this.loadPlans();
    },

    showShell() {
        document.getElementById('top-nav').classList.remove('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');
        document.getElementById('fab-add-habit').classList.add('hidden');
    },

    async loadPlans() {
        const container = document.getElementById('today-plan-list');
        try {
            const result = await apiClient.get('/plan/dashboard');
            const cards = result.data || [];
            this.renderProgress(cards);
            if (!cards.length) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">✨</div>
                        <div class="empty-title">今天还没有计划</div>
                        <div class="empty-desc">创建一个计划后，Today 会成为你的每日执行清单。</div>
                        <button class="empty-cta" onclick="PageRouter.navigate('create-plan')">创建计划</button>
                    </div>
                `;
                return;
            }
            container.innerHTML = cards.map(card => HabitCard.render(card)).join('');
        } catch (e) {
            this.renderProgress([]);
            container.innerHTML = `<div class="empty-state"><div class="empty-title">加载失败</div><div class="empty-desc">${this.escapeHtml(e.message)}</div></div>`;
        }
    },

    renderProgress(cards) {
        const total = cards.length;
        const done = cards.filter(card => card.todayCompleted).length;
        const percent = total ? Math.round(done / total * 100) : 0;
        const label = document.getElementById('today-progress-label');
        const fill = document.getElementById('today-progress-fill');
        if (label) label.textContent = total ? `${done}/${total} · ${percent}%` : '暂无计划';
        if (fill) fill.style.width = `${percent}%`;
    },

    openCoachReview() {
        const text = document.getElementById('today-review-text')?.value?.trim();
        localStorage.setItem('selfpline_today_review_draft', text || '');
        PageRouter.navigate('ai-coach', { sceneKey: 'daily_checkin' });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
};
