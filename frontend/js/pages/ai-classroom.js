// 创建计划 AI 指导页（Build / Quit + 细分计划类型）
const AiClassroom = {
    sessionId: null,
    direction: 'BUILD',
    planReady: false,
    selectedSceneKey: null,
    selectedTargetName: '',
    scenarios: [],
    planSummary: null,
    isSending: false,
    currentAssistantBubbleId: null,

    async render(params = {}) {
        this.direction = params.direction || 'BUILD';
        this.sessionId = null;
        this.planReady = false;
        this.planSummary = null;
        this.selectedSceneKey = params.sceneKey || null;
        this.selectedTargetName = params.targetName || '';
        this.isSending = false;
        this.currentAssistantBubbleId = null;

        document.getElementById('top-nav').classList.remove('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');
        document.getElementById('fab-add-habit').classList.add('hidden');

        const dirLabel = this.direction === 'BUILD' ? 'Build · 建立好习惯' : 'Quit · 戒除坏习惯';
        const badgeClass = this.direction === 'BUILD' ? 'build' : 'quit';

        document.getElementById('page-container').innerHTML = `
            <div class="classroom-layout">
                <div class="classroom-header">
                    <button class="classroom-back-btn" onclick="PageRouter.navigate('dashboard')" aria-label="返回 Dashboard">←</button>
                    <div>
                        <p class="page-kicker">创建计划</p>
                        <span class="classroom-title">先选计划类型，再和 AI 细化执行方案</span>
                    </div>
                </div>

                <section class="plan-target-panel">
                    <div class="target-panel-heading">
                        <h2>计划类型</h2>
                        <span id="classroom-direction-label">${dirLabel}</span>
                    </div>
                    <div class="scenario-selector" id="scenario-selector"></div>
                </section>

                <div class="plan-panel">
                    <span class="plan-direction-badge ${badgeClass}" id="plan-direction-badge">${this.direction === 'QUIT' ? '戒除坏习惯' : '建立好习惯'}</span>
                    <div id="plan-summary">请选择一个细分计划类型，并描述你的具体目标。</div>
                </div>

                <div class="chat-area">
                    <div class="chat-messages" id="classroom-chat"></div>
                    <div class="chat-input-row">
                        <input id="classroom-input" placeholder="描述目标，也可以说：直接生成计划">
                        <button id="classroom-send-btn">发送</button>
                    </div>
                    <div class="plan-confirm-bar hidden" id="plan-confirm-bar">
                        <button class="btn-confirm" onclick="AiClassroom.confirmPlan()">确认并开始计划</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('classroom-send-btn')?.addEventListener('click', () => this.sendMessage());
        document.getElementById('classroom-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        await this.loadScenarios();
        this.initChat();
    },

    async loadScenarios() {
        this.renderScenarioLoading();
        try {
            const result = await apiClient.get('/ai/scenarios?category=plan_creation');
            const scenes = Array.isArray(result.data) ? result.data : [];
            const planScenes = scenes.filter(scene =>
                scene.category === 'plan_creation'
                && scene.planCreationSupported !== false
            );
            this.scenarios = planScenes.length ? planScenes : this.getFallbackScenarios();
        } catch (e) {
            Toast.show('AI 场景加载失败，已使用本地配置');
            this.scenarios = this.getFallbackScenarios();
        }

        const directionScenes = this.getDirectionScenes(this.direction);
        if (!directionScenes.some(scene => scene.sceneKey === this.selectedSceneKey)) {
            this.selectedSceneKey = directionScenes[0]?.sceneKey || this.selectedSceneKey;
        }

        const selected = this.scenarios.find(scene => scene.sceneKey === this.selectedSceneKey);
        this.selectedTargetName = selected?.sceneName || this.selectedTargetName;
        this.renderScenarios();
        this.updateDirectionMeta();
    },

    getDirectionScenes(direction) {
        const scenes = this.scenarios.filter(scene => (scene.defaultDirection || 'BUILD') === direction);
        return scenes.length ? scenes : this.scenarios;
    },

    getFallbackScenarios() {
        return [
            { sceneKey: 'build_exercise_habit', sceneName: '建立运动习惯', sceneDescription: '循序渐进的训练安排', icon: '🏃', accentColor: '#FF8A3D', defaultDirection: 'BUILD' },
            { sceneKey: 'build_study_focus', sceneName: '学习专注计划', sceneDescription: '专注节奏与抗干扰', icon: '📚', accentColor: '#5DA9FF', defaultDirection: 'BUILD' },
            { sceneKey: 'build_sleep_early', sceneName: '早睡早起', sceneDescription: '稳定作息与睡前流程', icon: '🌙', accentColor: '#7C8BFF', defaultDirection: 'BUILD' },
            { sceneKey: 'build_hydration_diet', sceneName: '饮水/健康饮食', sceneDescription: '饮食与饮水打卡', icon: '🥗', accentColor: '#37C978', defaultDirection: 'BUILD' },
            { sceneKey: 'build_reading_habit', sceneName: '阅读习惯', sceneDescription: '每日阅读微行动', icon: '📖', accentColor: '#8F7CFF', defaultDirection: 'BUILD' },
            { sceneKey: 'build_meditation_relax', sceneName: '冥想放松', sceneDescription: '呼吸练习与放松节奏', icon: '🧘', accentColor: '#9B25E8', defaultDirection: 'BUILD' },
            { sceneKey: 'build_custom_plan', sceneName: '自定义养成计划', sceneDescription: '描述你想建立的计划', icon: '✨', accentColor: '#2EA7DF', defaultDirection: 'BUILD' },
            { sceneKey: 'quit_stay_up_late', sceneName: '戒熬夜', sceneDescription: '晚间触发识别与替代', icon: '🌃', accentColor: '#FF6B6B', defaultDirection: 'QUIT' },
            { sceneKey: 'quit_short_video', sceneName: '减少刷短视频', sceneDescription: '限额与替代行为', icon: '📵', accentColor: '#FF6B6B', defaultDirection: 'QUIT' },
            { sceneKey: 'quit_smoking_less', sceneName: '戒烟/少烟', sceneDescription: '减量路径与复发恢复', icon: '🚭', accentColor: '#FF6B6B', defaultDirection: 'QUIT' },
            { sceneKey: 'quit_caffeine_control', sceneName: '控制咖啡因', sceneDescription: '循序减量与替代方案', icon: '☕', accentColor: '#FF9C5A', defaultDirection: 'QUIT' },
            { sceneKey: 'quit_junk_food', sceneName: '减少外卖/垃圾食品', sceneDescription: '减少高热量触发', icon: '🍔', accentColor: '#FF6B6B', defaultDirection: 'QUIT' },
            { sceneKey: 'quit_procrastination', sceneName: '减少拖延', sceneDescription: '降低启动阻力', icon: '⏱️', accentColor: '#FF6B6B', defaultDirection: 'QUIT' },
            { sceneKey: 'quit_custom_plan', sceneName: '自定义戒除计划', sceneDescription: '描述你想减少的行为', icon: '🧭', accentColor: '#E9340B', defaultDirection: 'QUIT' }
        ];
    },

    renderScenarioLoading() {
        const container = document.getElementById('scenario-selector');
        if (!container) return;
        container.innerHTML = `
            <div class="scenario-loading">
                <span></span><span></span><span></span>
            </div>
        `;
    },

    renderScenarios() {
        const container = document.getElementById('scenario-selector');
        if (!container) return;
        const scenes = this.getDirectionScenes(this.direction);
        if (!scenes.length) {
            container.innerHTML = '<div class="scenario-empty">暂无可用计划类型</div>';
            return;
        }
        container.innerHTML = scenes.map(scene => `
            <button class="scenario-chip${scene.sceneKey === this.selectedSceneKey ? ' selected' : ''}"
                    style="--scene-accent:${scene.accentColor || '#FF7A3D'}"
                    onclick="AiClassroom.selectScenario('${scene.sceneKey}')">
                <span class="scene-icon">${scene.icon || '✨'}</span>
                <span class="scene-name">${this.escapeHtml(scene.sceneName || '')}</span>
                <span class="scene-desc">${this.escapeHtml(scene.sceneDescription || '')}</span>
            </button>
        `).join('');
    },

    selectScenario(sceneKey) {
        if (this.sessionId) {
            Toast.show('当前计划会话已开始，下次创建计划时生效');
            return;
        }
        const scene = this.scenarios.find(item => item.sceneKey === sceneKey);
        if (!scene) return;
        this.selectedSceneKey = sceneKey;
        this.direction = scene.defaultDirection || this.direction;
        this.selectedTargetName = scene.sceneName || '';
        this.renderScenarios();
        this.updateDirectionMeta();
        this.initChat();
    },

    updateDirectionMeta() {
        const directionLabel = document.getElementById('classroom-direction-label');
        const badge = document.getElementById('plan-direction-badge');
        const isQuit = this.direction === 'QUIT';
        if (directionLabel) {
            directionLabel.textContent = isQuit ? 'Quit · 戒除坏习惯' : 'Build · 建立好习惯';
        }
        if (badge) {
            badge.className = `plan-direction-badge ${isQuit ? 'quit' : 'build'}`;
            badge.textContent = isQuit ? '戒除坏习惯' : '建立好习惯';
        }
    },

    initChat() {
        const chat = document.getElementById('classroom-chat');
        if (!chat) return;
        chat.innerHTML = '';
        const sceneName = this.selectedTargetName || this.getSelectedSceneName();
        this.appendMessage('system', `已选择「${sceneName}」。描述目标即可；想快速开始时，可以直接说“直接生成计划”。`);
    },

    async sendMessage() {
        if (this.isSending) return;
        const input = document.getElementById('classroom-input');
        const sendBtn = document.getElementById('classroom-send-btn');
        const message = input?.value?.trim() || '';
        if (!message) return;

        this.appendMessage('user', message);
        input.value = '';
        this.isSending = true;
        if (sendBtn) sendBtn.disabled = true;
        if (input) input.disabled = true;
        this.showTyping();

        try {
            if (!this.sessionId) {
                await this.startPlanSession(message);
            } else {
                await this.continuePlanSession(message);
            }
        } catch (e) {
            this.hideTyping();
            this.appendMessage('system', `发送失败：${e.message}`);
            Toast.show(`发送失败：${e.message}`);
        } finally {
            this.isSending = false;
            if (sendBtn) sendBtn.disabled = false;
            if (input) input.disabled = false;
            input?.focus();
        }
    },

    async startPlanSession(topic) {
        const self = this;
        let fullResponse = '';

        await apiClient.streamPost('/ai/plan-init/stream', {
            direction: this.direction,
            topic,
            sceneKey: this.selectedSceneKey
        }, {
            onMeta(data) {
                if (data.sessionId) self.sessionId = data.sessionId;
            },
            onToken(data) {
                const text = data.content || '';
                fullResponse += text;
                self.updateCurrentAiBubble(fullResponse, false);
                console.debug('[stream] current assistant message length', fullResponse.length);
            },
            onPlanReady(data) {
                self.planReady = true;
                self.showPlanSummary(data.planSummary || {});
                document.getElementById('plan-confirm-bar')?.classList.remove('hidden');
                self.appendMessage('system', '计划已生成，可点击下方按钮确认并开始执行。');
            },
            onDone() {
                self.hideTyping();
                self.updateCurrentAiBubble(fullResponse, true);
                if (!fullResponse.trim()) {
                    self.appendMessage('system', 'AI 暂无回复，请补充你的目标细节后再试。');
                }
                self.currentAssistantBubbleId = null;
            },
            onError(data) {
                self.hideTyping();
                self.appendMessage('system', '发送失败：' + (data.message || '未知错误'));
                Toast.show('发送失败：' + (data.message || '未知错误'));
            }
        });

        if (!this.sessionId) {
            this.appendMessage('system', 'AI 初始化响应异常');
        }
    },

    async continuePlanSession(message) {
        const self = this;
        let fullResponse = '';

        await apiClient.streamPost('/ai/plan-chat/stream', {
            sessionId: this.sessionId,
            message,
            sceneKey: this.selectedSceneKey
        }, {
            onToken(data) {
                const text = data.content || '';
                fullResponse += text;
                self.updateCurrentAiBubble(fullResponse, false);
                console.debug('[stream] current assistant message length', fullResponse.length);
            },
            onPlanReady(data) {
                self.planReady = true;
                self.showPlanSummary(data.planSummary || {});
                document.getElementById('plan-confirm-bar')?.classList.remove('hidden');
                self.appendMessage('system', '计划已生成，可点击下方按钮确认并开始执行。');
            },
            onDone() {
                self.hideTyping();
                self.updateCurrentAiBubble(fullResponse, true);
                if (!fullResponse.trim()) {
                    self.appendMessage('system', 'AI 暂无回复，请稍后重试');
                }
                self.currentAssistantBubbleId = null;
            },
            onError(data) {
                self.hideTyping();
                self.appendMessage('system', '发送失败：' + (data.message || '未知错误'));
                Toast.show('发送失败：' + (data.message || '未知错误'));
            }
        });
    },

    showPlanSummary(summary) {
        this.planSummary = {
            ...summary,
            trackingMode: 1,
            planDirection: this.direction === 'QUIT' ? 2 : 1,
            shortName: summary.shortName || summary.targetName || this.getSelectedSceneName()
        };
        document.getElementById('plan-summary').innerHTML = `
            <strong>AI 建议计划：</strong>
            <ul class="plan-summary-list">
                <li>目标：${this.escapeHtml(this.planSummary.targetName || '-')}</li>
                <li>首页短名：${this.escapeHtml(this.planSummary.shortName || '-')}</li>
                <li>追踪方式：复选框打卡</li>
                <li>主题色：<span class="plan-color-chip" style="background:${this.planSummary.themeColor || '#FF7A3D'}"></span></li>
                <li>图标：${this.escapeHtml(this.planSummary.icon || '-')}</li>
            </ul>
        `;
    },

    appendMessage(role, text) {
        const container = document.getElementById('classroom-chat');
        if (!container) return;
        const div = document.createElement('div');
        div.className = `chat-message ${role}`;
        div.innerHTML = this.simpleMarkdown(text || '');
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    },

    simpleMarkdown(text) {
        return this.escapeHtml(text || '')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    },

    showTyping() {
        const messagesContainer = document.getElementById('classroom-chat');
        if (!messagesContainer) return;
        const typingEl = document.createElement('div');
        this.currentAssistantBubbleId = 'classroom-assistant-' + Date.now();
        typingEl.className = 'chat-message ai typing';
        typingEl.id = this.currentAssistantBubbleId;
        typingEl.dataset.streamingAssistant = 'true';
        typingEl.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
        messagesContainer.appendChild(typingEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    hideTyping() {
        const typingEl = this.currentAssistantBubbleId
            ? document.getElementById(this.currentAssistantBubbleId)
            : document.querySelector('#classroom-chat .chat-message.ai.typing');
        if (typingEl?.classList.contains('typing')) typingEl.remove();
    },

    updateCurrentAiBubble(text, finalRender = false) {
        const container = document.getElementById('classroom-chat');
        if (!container) return;
        let bubble = this.currentAssistantBubbleId ? document.getElementById(this.currentAssistantBubbleId) : null;
        if (!bubble) {
            this.currentAssistantBubbleId = 'classroom-assistant-' + Date.now();
            bubble = document.createElement('div');
            bubble.id = this.currentAssistantBubbleId;
            bubble.dataset.streamingAssistant = 'true';
            container.appendChild(bubble);
        }
        bubble.className = 'chat-message ai';
        bubble.innerHTML = finalRender
            ? this.simpleMarkdown(text || '')
            : this.escapeHtml(text || '').replace(/\n/g, '<br>');
        container.scrollTop = container.scrollHeight;
    },

    async confirmPlan() {
        if (!this.planSummary) {
            Toast.show('AI 还没有生成完整计划');
            return;
        }
        const btn = document.querySelector('#plan-confirm-bar .btn-confirm');
        if (btn) {
            btn.disabled = true;
            btn.classList.add('btn-loading');
        }
        try {
            await apiClient.post('/ai/plan-confirm', {
                sessionId: this.sessionId,
                planData: {
                    ...this.planSummary,
                    trackingMode: 1,
                    planDirection: this.direction === 'QUIT' ? 2 : 1,
                    shortName: this.planSummary.shortName || this.planSummary.targetName || this.getSelectedSceneName()
                }
            });
            Toast.show('计划创建成功！');
            PageRouter.navigate('plans');
        } catch (e) {
            Toast.show(`确认失败：${e.message}`);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('btn-loading');
            }
        }
    },

    getSelectedSceneName() {
        const scene = this.scenarios.find(item => item.sceneKey === this.selectedSceneKey);
        return scene?.sceneName || '计划目标';
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
};
