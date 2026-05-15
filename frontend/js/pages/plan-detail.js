// 计划详情页 — 每日记录 + AI 辅助聊天
const PlanDetailPage = {
    planId: null,
    planData: null,
    assistSceneKey: 'daily_checkin',
    assistScenarios: [],

    async render(params = {}) {
        if (!params.planId) {
            const routeParams = PageRouter.getParams();
            params = routeParams;
        }
        this.planId = params.planId;
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
                        <button class="empty-cta" onclick="PageRouter.navigate('home')">返回首页</button>
                    </div>
                </div>
            `;
            return;
        }

        document.getElementById('page-container').innerHTML = `
            <div class="plan-detail-shell">
                <div id="plan-detail-content" class="plan-detail-content loading">加载中...</div>
                <aside class="ai-assist-chat expanded" id="ai-assist-chat">
                    <button class="assist-chat-toggle" onclick="PlanDetailPage.toggleAssistChat()">💬 AI 助手</button>
                    <div class="assist-scene-row" id="assist-scene-row">
                    <select id="assist-scene-select" onchange="PlanDetailPage.selectAssistScene(this.value)"></select>
                    </div>
                    <div class="assist-chat-messages" id="assist-chat-messages">
                        <div class="chat-bubble ai">需要调整计划、复盘阻力或整理明天行动时，可以直接问我。</div>
                    </div>
                    <div class="assist-chat-input-row" id="assist-chat-input-row">
                        <input id="assist-chat-input" placeholder="跟 AI 聊聊今天...">
                        <button id="assist-chat-send" onclick="PlanDetailPage.sendAssistMessage()">发送</button>
                    </div>
                </aside>
            </div>
        `;

        await this.loadAssistScenarios();
        await this.loadDetail();

        document.getElementById('assist-chat-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.sendAssistMessage();
        });
    },

    async loadDetail() {
        try {
            const result = await apiClient.get(`/plan/${this.planId}/detail`);
            this.planData = result.data;
            this.trackingMode = result.data.trackingMode;
            this.renderContent();
            // Load today's log
            this.loadLogForDate(new Date().toISOString().split('T')[0]);
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

    async loadAssistScenarios() {
        try {
            const result = await apiClient.get('/ai/scenarios');
            const scenes = Array.isArray(result.data) ? result.data : [];
            this.assistScenarios = scenes.filter(scene =>
                (scene.category === 'coach_chat' || scene.planCreationSupported === false)
                && scene.assistSupported !== false
            );
        } catch (e) {
            this.assistScenarios = this.getFallbackAssistScenarios();
        }
        if (!this.assistScenarios.length) {
            this.assistScenarios = this.getFallbackAssistScenarios();
        }
        this.renderAssistScenarios();
    },

    getFallbackAssistScenarios() {
        return [
            { sceneKey: 'daily_checkin', sceneName: '每日打卡' },
            { sceneKey: 'weekly_review', sceneName: '周复盘' },
            { sceneKey: 'coach_gentle_companion', sceneName: '温柔陪伴型' },
            { sceneKey: 'coach_strict_accountability', sceneName: '严格督促型' },
            { sceneKey: 'coach_emotional_support', sceneName: '情绪支持型' }
        ];
    },

    renderAssistScenarios() {
        const select = document.getElementById('assist-scene-select');
        if (!select) return;
        if (!this.assistScenarios.some(scene => scene.sceneKey === this.assistSceneKey)) {
            this.assistSceneKey = this.assistScenarios[0]?.sceneKey || 'daily_checkin';
        }
        select.innerHTML = this.assistScenarios.map(scene => `
            <option value="${scene.sceneKey}" ${scene.sceneKey === this.assistSceneKey ? 'selected' : ''}>
                ${scene.icon || '✨'} ${scene.sceneName}
            </option>
        `).join('');
    },

    selectAssistScene(sceneKey) {
        this.assistSceneKey = sceneKey || 'daily_checkin';
    },

    renderContent() {
        const p = this.planData;
        const dirLabel = p.planDirection === 1 ? 'Build · 养成' : 'Quit · 戒除';
        const dirColor = p.planDirection === 1 ? 'var(--color-build)' : 'var(--color-quit)';
        const dirBg = p.planDirection === 1 ? 'var(--color-build-soft)' : 'var(--color-quit-soft)';
        const completionRate = Number.isFinite(Number(p.completionRate)) ? Number(p.completionRate) : 0;

        document.getElementById('plan-detail-content').innerHTML = `
            <div class="detail-back-row">
                <button onclick="history.back()">← 返回</button>
            </div>

            <div class="plan-detail-grid">
                <section class="plan-detail-header">
                    <div class="plan-icon">${this.escapeHtml(p.icon || '📋')}</div>
                    <div class="plan-name">${this.escapeHtml(p.targetName || '未命名计划')}</div>
                    <span class="streak-badge" style="background:${dirBg};color:${dirColor}">${dirLabel}</span>
                    <div class="plan-meta">🔥 连续 <strong>${p.streakDays || 0}</strong> 天 · 完成率 <strong>${(completionRate * 100).toFixed(0)}%</strong></div>
                </section>

                <section class="daily-record-section">
                    <h3>📅 今日活动记录</h3>
                    <div class="date-picker-row">
                        <input type="date" id="recordDatePicker" value="${new Date().toISOString().split('T')[0]}" onchange="PlanDetailPage.loadLogForDate(this.value)">
                    </div>
                    <div class="tracker-component" id="trackerContainer"></div>
                    <textarea class="notes-input" id="plan-notes" placeholder="记录今日心得..."></textarea>
                    <button class="btn btn-primary detail-save-btn" onclick="DailyTracker.submitLog(true)">保存记录</button>
                </section>

                <section class="daily-record-section plan-content-section">
                    <h3>📋 AI 计划内容</h3>
                    <div class="plan-content-text">${this.escapeHtml(p.planContent || '暂无详细计划内容').replace(/\n/g, '<br>')}</div>
                </section>
                <div class="daily-record-section detail-tip-section">
                    <h3>下一步</h3>
                    <p>完成今天的记录后，可以在右侧 AI 助手里复盘阻力、调整目标或生成明天的行动建议。</p>
                </div>
            </div>
        `;

        DailyTracker.init(this.planId, this.trackingMode);
    },

    async loadLogForDate(dateStr) {
        const trackerContainer = document.getElementById('trackerContainer') || document.getElementById('tracker-container');
        if (!trackerContainer) return;

        try {
            const result = await apiClient.get(`/plan/${this.planId}/daily-logs?startDate=${dateStr}&endDate=${dateStr}`);
            const logs = result.data || [];
            const existingLog = logs.length > 0 ? logs[0] : null;

            // Re-initialize tracker with existing log data
            DailyTracker.init(this.planId, this.trackingMode, existingLog);

            // If there's a notes field, populate it
            const notesEl = document.getElementById('plan-notes');
            if (notesEl && existingLog && existingLog.notes) {
                notesEl.value = existingLog.notes || '';
            } else if (notesEl) {
                notesEl.value = '';
            }
        } catch (e) {
            // If no logs found, init with empty
            DailyTracker.init(this.planId, this.trackingMode, null);
        }
    },

    toggleAssistChat() {
        const chat = document.getElementById('ai-assist-chat');
        const msgs = document.getElementById('assist-chat-messages');
        const sceneRow = document.getElementById('assist-scene-row');
        const inputRow = document.getElementById('assist-chat-input-row');

        if (chat.classList.contains('collapsed')) {
            chat.classList.remove('collapsed');
            chat.classList.add('expanded');
            sceneRow.classList.remove('hidden');
            msgs.classList.remove('hidden');
            inputRow.classList.remove('hidden');
        } else {
            chat.classList.remove('expanded');
            chat.classList.add('collapsed');
            sceneRow.classList.add('hidden');
            msgs.classList.add('hidden');
            inputRow.classList.add('hidden');
        }
    },

    async sendAssistMessage() {
        const input = document.getElementById('assist-chat-input');
        const message = input.value.trim();
        if (!message) return;

        const container = document.getElementById('assist-chat-messages');
        const sendBtn = document.getElementById('assist-chat-send');
        const loadingId = 'assist-loading-' + Date.now();
        container.insertAdjacentHTML('beforeend', `<div class="chat-bubble user">${this.escapeHtml(message)}</div>`);
        container.insertAdjacentHTML('beforeend', `<div class="chat-bubble ai loading" id="${loadingId}">AI 正在整理建议...</div>`);
        container.scrollTop = container.scrollHeight;
        input.value = '';
        sendBtn.disabled = true;

        try {
            const reply = await apiClient.post('/ai/assist-chat', {
                planId: this.planId,
                message: message,
                sceneKey: this.assistSceneKey
            });
            const loading = document.getElementById(loadingId);
            if (loading) loading.remove();
            if (!reply.data) {
                throw new Error('AI 暂无回复，请稍后重试');
            }
            container.insertAdjacentHTML('beforeend', `<div class="chat-bubble ai">${this.escapeHtml(reply.data).replace(/\n/g, '<br>')}</div>`);
            container.scrollTop = container.scrollHeight;
        } catch (e) {
            const loading = document.getElementById(loadingId);
            if (loading) loading.remove();
            Toast.show('发送失败: ' + e.message);
        } finally {
            sendBtn.disabled = false;
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
};
