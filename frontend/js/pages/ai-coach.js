// AI 指导师独立聊天页（身份/风格聊天）
const AiCoachPage = {
    scenes: [],
    selectedSceneKey: null,
    messagesByScene: {},
    isSending: false,

    async render(params = {}) {
        document.getElementById('top-nav').classList.remove('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');
        document.getElementById('fab-add-habit').classList.add('hidden');

        this.selectedSceneKey = params.sceneKey
            || localStorage.getItem('selfpline_ai_coach_scene')
            || null;

        document.getElementById('page-container').innerHTML = `
            <div class="ai-coach-shell">
                <aside class="ai-coach-identities">
                    <div class="ai-coach-identities-head">
                        <button class="classroom-back-btn" type="button" onclick="PageRouter.navigate('home')" aria-label="返回首页">←</button>
                        <div>
                            <p class="page-kicker">AI 指导师</p>
                            <h2>选择你的指导身份</h2>
                        </div>
                    </div>
                    <div class="ai-coach-identity-list" id="ai-coach-identity-list">
                        <div class="panel-loading">加载中...</div>
                    </div>
                </aside>
                <section class="ai-coach-chat-panel">
                    <div class="ai-coach-chat-head">
                        <h3 id="ai-coach-scene-name">AI 指导师</h3>
                        <p id="ai-coach-scene-desc">请选择左侧身份后开始聊天。</p>
                    </div>
                    <div class="ai-coach-messages" id="ai-coach-messages"></div>
                    <div class="ai-coach-suggestions" id="ai-coach-suggestions"></div>
                    <div class="ai-coach-input-row">
                        <input id="ai-coach-input" placeholder="和 AI 指导师聊聊今天...">
                        <button id="ai-coach-send-btn" type="button">发送</button>
                    </div>
                </section>
            </div>
        `;

        document.getElementById('ai-coach-send-btn')?.addEventListener('click', () => this.sendMessage());
        document.getElementById('ai-coach-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        await this.loadScenes();
    },

    async loadScenes() {
        try {
            const result = await apiClient.get('/ai/scenarios?category=coach_chat');
            const scenes = Array.isArray(result.data) ? result.data : [];
            this.scenes = scenes.filter(scene =>
                scene.category === 'coach_chat'
                && scene.coachChatSupported !== false
            );
        } catch (e) {
            this.scenes = [];
        }

        if (!this.scenes.length) {
            this.scenes = this.getFallbackScenes();
        }

        if (!this.scenes.some(scene => scene.sceneKey === this.selectedSceneKey)) {
            this.selectedSceneKey = this.scenes[0]?.sceneKey || null;
        }

        this.renderIdentityList();
        this.selectScene(this.selectedSceneKey, false);
    },

    getFallbackScenes() {
        return [
            { sceneKey: 'coach_gentle_companion', sceneName: '温柔陪伴型', sceneDescription: '低压力推进', icon: '🌿', suggestedUserInputs: ['今天状态一般，给我一个可执行动作'] },
            { sceneKey: 'coach_strict_accountability', sceneName: '严格督促型', sceneDescription: '强调执行边界', icon: '🔥', suggestedUserInputs: ['请直接给我今天必须完成的一件事'] },
            { sceneKey: 'coach_professional_planner', sceneName: '专业规划型', sceneDescription: '目标拆解与节奏规划', icon: '🎯', suggestedUserInputs: ['帮我拆解这周目标'] },
            { sceneKey: 'coach_study_focus', sceneName: '学习专注型', sceneDescription: '专注和抗干扰', icon: '📚', suggestedUserInputs: ['帮我开一轮25分钟专注'] },
            { sceneKey: 'coach_sports_health', sceneName: '运动健康型', sceneDescription: '训练与恢复建议', icon: '🏃', suggestedUserInputs: ['今天适合做什么运动'] },
            { sceneKey: 'coach_emotional_support', sceneName: '情绪支持型', sceneDescription: '情绪梳理与支持', icon: '💗', suggestedUserInputs: ['我有点焦虑，想先梳理一下'] }
        ];
    },

    renderIdentityList() {
        const container = document.getElementById('ai-coach-identity-list');
        if (!container) return;
        container.innerHTML = this.scenes.map(scene => `
            <button type="button"
                    class="ai-coach-identity-btn${scene.sceneKey === this.selectedSceneKey ? ' selected' : ''}"
                    onclick="AiCoachPage.selectScene('${scene.sceneKey}')">
                <span class="identity-icon">${scene.icon || '✨'}</span>
                <span class="identity-copy">
                    <strong>${this.escapeHtml(scene.sceneName || 'AI 指导师')}</strong>
                    <small>${this.escapeHtml(scene.sceneDescription || '')}</small>
                </span>
            </button>
        `).join('');
    },

    selectScene(sceneKey, rerenderList = true) {
        if (!sceneKey) return;
        this.selectedSceneKey = sceneKey;
        localStorage.setItem('selfpline_ai_coach_scene', sceneKey);
        if (rerenderList) this.renderIdentityList();

        const scene = this.scenes.find(item => item.sceneKey === sceneKey);
        const nameEl = document.getElementById('ai-coach-scene-name');
        const descEl = document.getElementById('ai-coach-scene-desc');
        if (nameEl) nameEl.textContent = scene?.sceneName || 'AI 指导师';
        if (descEl) descEl.textContent = scene?.sceneDescription || '日常陪伴、建议、问答、复盘';

        if (!Array.isArray(this.messagesByScene[sceneKey]) || this.messagesByScene[sceneKey].length === 0) {
            this.messagesByScene[sceneKey] = [{
                role: 'ai',
                text: `你好，我是「${scene?.sceneName || 'AI 指导师'}」。告诉我你当前最想解决的一件事。`
            }];
        }
        this.renderMessages(sceneKey);
        this.renderSuggestions(scene);
    },

    renderSuggestions(scene) {
        const container = document.getElementById('ai-coach-suggestions');
        if (!container) return;
        const suggestions = Array.isArray(scene?.suggestedUserInputs) ? scene.suggestedUserInputs.slice(0, 3) : [];
        if (!suggestions.length) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = suggestions.map(text => `
            <button type="button" class="ai-coach-suggestion-btn" onclick="AiCoachPage.useSuggestion(decodeURIComponent('${this.encodeSuggestion(text)}'))">
                ${this.escapeHtml(text)}
            </button>
        `).join('');
    },

    useSuggestion(text) {
        const input = document.getElementById('ai-coach-input');
        if (!input) return;
        input.value = text || '';
        input.focus();
    },

    renderMessages(sceneKey) {
        const container = document.getElementById('ai-coach-messages');
        if (!container) return;
        const messages = this.messagesByScene[sceneKey] || [];
        container.innerHTML = messages.map(msg => `
            <div class="ai-coach-message ${msg.role}">
                ${this.escapeHtml(msg.text || '').replace(/\n/g, '<br>')}
            </div>
        `).join('');
        container.scrollTop = container.scrollHeight;
    },

    appendMessage(role, text) {
        const sceneKey = this.selectedSceneKey;
        if (!sceneKey) return;
        if (!Array.isArray(this.messagesByScene[sceneKey])) {
            this.messagesByScene[sceneKey] = [];
        }
        this.messagesByScene[sceneKey].push({ role, text });
        this.renderMessages(sceneKey);
    },

    showTyping() {
        this.appendMessage('loading', 'AI 正在思考...');
    },

    hideTyping() {
        const sceneKey = this.selectedSceneKey;
        if (!sceneKey || !Array.isArray(this.messagesByScene[sceneKey])) return;
        this.messagesByScene[sceneKey] = this.messagesByScene[sceneKey].filter(item => item.role !== 'loading');
        this.renderMessages(sceneKey);
    },

    async sendMessage() {
        if (this.isSending) return;
        const input = document.getElementById('ai-coach-input');
        const sendBtn = document.getElementById('ai-coach-send-btn');
        const message = input?.value?.trim() || '';
        if (!message || !this.selectedSceneKey) return;

        this.appendMessage('user', message);
        input.value = '';
        this.isSending = true;
        if (sendBtn) sendBtn.disabled = true;
        this.showTyping();

        try {
            const result = await apiClient.post('/ai/coach-chat', {
                sceneKey: this.selectedSceneKey,
                message
            }, 90000);
            this.hideTyping();
            const aiMessage = result?.data;
            if (!aiMessage || typeof aiMessage !== 'string' || !aiMessage.trim()) {
                throw new Error('AI 暂无回复，请稍后再试');
            }
            this.appendMessage('ai', aiMessage);
            this.saveLastSnapshot(aiMessage);
        } catch (e) {
            this.hideTyping();
            this.appendMessage('system', `发送失败：${e.message}`);
            Toast.show(`发送失败：${e.message}`);
        } finally {
            this.isSending = false;
            if (sendBtn) sendBtn.disabled = false;
        }
    },

    saveLastSnapshot(aiMessage) {
        const scene = this.scenes.find(item => item.sceneKey === this.selectedSceneKey);
        localStorage.setItem('selfpline_ai_coach_last', JSON.stringify({
            sceneKey: this.selectedSceneKey,
            sceneName: scene?.sceneName || 'AI 指导师',
            preview: (aiMessage || '').replace(/\s+/g, ' ').slice(0, 80),
            updatedAt: new Date().toISOString()
        }));
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    },

    escapeAttr(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    encodeSuggestion(text) {
        return encodeURIComponent(text || '');
    }
};
