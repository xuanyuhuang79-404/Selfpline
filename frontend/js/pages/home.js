// 首页 - 习惯卡片列表
const HomePage = {
    coachQuickScenes: [
        { key: 'coach_gentle_companion', label: '温柔陪伴型', icon: '🌿', desc: '低压力推进' },
        { key: 'coach_strict_accountability', label: '严格督促型', icon: '🔥', desc: '强执行节奏' },
        { key: 'coach_professional_planner', label: '专业规划型', icon: '🎯', desc: '拆解目标' },
        { key: 'coach_study_focus', label: '学习专注型', icon: '📚', desc: '专注抗干扰' },
        { key: 'coach_sports_health', label: '运动健康型', icon: '🏃', desc: '训练与恢复' },
        { key: 'coach_emotional_support', label: '情绪支持型', icon: '💗', desc: '情绪梳理' }
    ],

    async render() {
        document.getElementById('top-nav').classList.remove('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');
        document.getElementById('fab-add-habit').classList.add('hidden');

        document.getElementById('page-container').innerHTML = `
            <div class="home-dashboard">
                <section class="home-hero">
                    <div>
                        <p class="page-kicker">今日习惯工作台</p>
                        <h1>把今天安排清楚</h1>
                        <p>查看本周节奏、推进习惯计划，并在需要时让 AI 指导师帮你拆解下一步。</p>
                    </div>
                </section>

                <section class="dashboard-card week-panel">
                    <div class="section-heading">
                        <h2>本周节奏</h2>
                        <span>按天查看计划分布</span>
                    </div>
                    <div class="week-strip" id="week-strip"></div>
                </section>

                <section class="dashboard-card habit-panel">
                    <div class="section-heading">
                        <h2>今日计划</h2>
                        <span id="habit-count-label">加载中...</span>
                    </div>
                    <div class="habit-cards-list" id="habit-cards-list">
                        <div class="panel-loading">加载中...</div>
                    </div>
                </section>

                <aside class="home-side-panel">
                    <section class="dashboard-card stat-panel">
                        <div class="section-heading">
                            <h2>进度概览</h2>
                            <span>实时状态</span>
                        </div>
                        <div class="home-stat-grid">
                            <div class="home-stat-card">
                                <strong id="stat-total">0</strong>
                                <span>进行中</span>
                            </div>
                            <div class="home-stat-card">
                                <strong id="stat-done">0</strong>
                                <span>今日完成</span>
                            </div>
                            <div class="home-stat-card">
                                <strong id="stat-build">0</strong>
                                <span>养成计划</span>
                            </div>
                            <div class="home-stat-card">
                                <strong id="stat-quit">0</strong>
                                <span>戒除计划</span>
                            </div>
                        </div>
                    </section>

                    <section class="dashboard-card ai-suggestion-card">
                        <div class="section-heading">
                            <h2>AI 指导师</h2>
                            <span>独立聊天入口</span>
                        </div>
                        <div class="ai-entry-summary" id="home-ai-summary"></div>
                        <div class="ai-entry-recent" id="home-ai-recent"></div>
                        <div class="ai-quick-scene-list" id="home-ai-quick-scenes"></div>
                        <button class="btn btn-primary home-enter-ai-btn" type="button" onclick="HomePage.openAiCoach()">
                            进入 AI 指导师
                        </button>
                    </section>
                </aside>
            </div>
        `;

        this.renderWeekStrip();
        this.renderAiEntryCard();
        await this.loadCards();
    },

    renderAiEntryCard() {
        const summaryEl = document.getElementById('home-ai-summary');
        const recentEl = document.getElementById('home-ai-recent');
        const quickEl = document.getElementById('home-ai-quick-scenes');
        if (!summaryEl || !recentEl || !quickEl) return;

        summaryEl.innerHTML = `
            <h3>今日建议摘要</h3>
            <p>先完成一个最小行动，再让 AI 指导师帮你复盘阻力并调整下一步。</p>
        `;

        const snapshot = this.getLastCoachSnapshot();
        if (snapshot) {
            recentEl.innerHTML = `
                <button type="button" class="ai-recent-button" onclick="HomePage.openAiCoach('${this.escapeHtml(snapshot.sceneKey)}')">
                    <span class="ai-recent-title">最近一次 AI 对话 · ${this.escapeHtml(snapshot.sceneName || 'AI 指导师')}</span>
                    <span class="ai-recent-preview">${this.escapeHtml(snapshot.preview || '')}</span>
                    <span class="ai-recent-time">${this.escapeHtml(this.formatTime(snapshot.updatedAt))}</span>
                </button>
            `;
        } else {
            recentEl.innerHTML = '<div class="ai-recent-empty">还没有最近对话，点击下方按钮开始。</div>';
        }

        quickEl.innerHTML = this.coachQuickScenes.map(scene => `
            <button type="button" class="ai-quick-scene-btn" onclick="HomePage.openAiCoach('${scene.key}')">
                <span>${scene.icon}</span>
                <strong>${scene.label}</strong>
                <small>${scene.desc}</small>
            </button>
        `).join('');
    },

    getLastCoachSnapshot() {
        try {
            const raw = localStorage.getItem('selfpline_ai_coach_last');
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.sceneKey) return null;
            return parsed;
        } catch (e) {
            return null;
        }
    },

    openAiCoach(sceneKey = '') {
        const params = sceneKey ? { sceneKey } : {};
        PageRouter.navigate('ai-coach', params);
    },

    formatTime(updatedAt) {
        if (!updatedAt) return '';
        const date = new Date(updatedAt);
        if (Number.isNaN(date.getTime())) return '';
        const month = `${date.getMonth() + 1}`.padStart(2, '0');
        const day = `${date.getDate()}`.padStart(2, '0');
        const hour = `${date.getHours()}`.padStart(2, '0');
        const minute = `${date.getMinutes()}`.padStart(2, '0');
        return `${month}-${day} ${hour}:${minute}`;
    },

    renderWeekStrip() {
        const strip = document.getElementById('week-strip');
        if (!strip) return;

        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

        const dayNames = ['一', '二', '三', '四', '五', '六', '日'];
        let html = '';

        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            const isToday = date.toDateString() === today.toDateString();
            const dateStr = String(date.getDate()).padStart(2, '0');
            const isoDate = date.toISOString().split('T')[0];

            html += `
                <div class="week-day${isToday ? ' today' : ''}" data-date="${isoDate}">
                    <span class="day-label">${dayNames[i]}</span>
                    <span class="day-date">${dateStr}</span>
                    <div class="dots"></div>
                </div>
            `;
        }
        strip.innerHTML = html;
    },

    async loadCards() {
        const container = document.getElementById('habit-cards-list');
        if (!container) return;

        try {
            const result = await apiClient.get('/plan/dashboard');
            const cards = result.data || [];
            this.renderSummary(cards);

            if (cards.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🎯</div>
                        <div class="empty-title">还没有习惯计划</div>
                        <div class="empty-desc">从一个清晰的计划目标开始。</div>
                        <button class="empty-cta create-plan-plus" aria-label="创建新计划" onclick="BottomSheet.show()">+</button>
                    </div>`;
                document.querySelectorAll('.dots').forEach(d => { d.innerHTML = ''; });
                return;
            }

            container.innerHTML = cards.map(card => HabitCard.render(card)).join('')
                + '<button type="button" class="create-plan-plus habit-create-plus" aria-label="创建新计划" onclick="BottomSheet.show()">+</button>';
            this.populateWeekDots(cards);
        } catch (e) {
            this.renderSummary([]);
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">😵</div><div class="empty-title">加载失败</div><div class="empty-desc">请稍后重试或检查后端服务</div></div>';
        }
    },

    renderSummary(cards) {
        const total = Array.isArray(cards) ? cards.length : 0;
        const done = Array.isArray(cards) ? cards.filter(card => card.todayCompleted).length : 0;
        const build = Array.isArray(cards) ? cards.filter(card => card.planDirection === 1).length : 0;
        const quit = total - build;

        const countLabel = document.getElementById('habit-count-label');
        if (countLabel) countLabel.textContent = total ? `${total} 个计划` : '暂无计划';

        const statMap = {
            'stat-total': total,
            'stat-done': done,
            'stat-build': build,
            'stat-quit': quit
        };
        Object.entries(statMap).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
    },

    populateWeekDots(cards) {
        const dayElements = document.querySelectorAll('.week-day');
        dayElements.forEach(dayEl => {
            const dotsContainer = dayEl.querySelector('.dots');
            if (!dotsContainer) return;
            dotsContainer.innerHTML = '';
            cards.forEach(card => {
                const dot = document.createElement('span');
                if (dayEl.classList.contains('today')) {
                    dot.className = 'dot active';
                    dot.style.background = card.themeColor || '#8BEA3C';
                } else {
                    dot.className = 'dot';
                }
                dot.title = card.targetName;
                dotsContainer.appendChild(dot);
            });
        });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
};
