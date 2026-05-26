// 个人中心：账号概览、AI 个性化与健康档案
const ProfilePage = {
    user: null,
    aiPreferenceLimit: 2000,

    async render() {
        document.getElementById('top-nav').classList.remove('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');
        document.getElementById('fab-add-habit').classList.add('hidden');

        document.getElementById('page-container').innerHTML = `
            <div class="profile-page">
                <div class="profile-header">
                    <div class="skeleton skeleton-avatar profile-skeleton-avatar"></div>
                    <div class="skeleton skeleton-text profile-skeleton-line short"></div>
                    <div class="skeleton skeleton-text profile-skeleton-line"></div>
                </div>
                <div class="profile-main-grid">
                    <div class="profile-section">
                        <div class="skeleton skeleton-text profile-skeleton-line title"></div>
                        <div class="skeleton skeleton-text profile-skeleton-line full"></div>
                        <div class="skeleton skeleton-text profile-skeleton-line wide"></div>
                    </div>
                    <div class="profile-section">
                        <div class="skeleton skeleton-text profile-skeleton-line title"></div>
                        <div class="skeleton skeleton-text profile-skeleton-line full"></div>
                    </div>
                </div>
            </div>
        `;

        await this.loadProfile();
    },

    async loadProfile() {
        try {
            const userResult = await apiClient.get('/user/profile');
            this.user = userResult.data || {};
            this.renderProfile(this.user);
        } catch (e) {
            document.getElementById('page-container').innerHTML = `
                <div class="profile-page">
                    <div class="empty-state">
                        <div class="empty-icon">😞</div>
                        <div class="empty-title">加载失败</div>
                        <div class="empty-desc">${this.escapeHtml(e.message)}</div>
                        <button class="empty-cta" onclick="ProfilePage.render()">重试</button>
                    </div>
                </div>
            `;
        }
    },

    renderProfile(user) {
        document.getElementById('page-container').innerHTML = `
            <div class="profile-page profile-settings-page">
                <aside class="profile-header">
                    <button class="profile-logout-inline" onclick="ProfilePage.logout()">退出登录</button>
                    <div class="profile-avatar">🏃</div>
                    <h2 class="profile-username">${this.escapeHtml(user.username || 'Selfpline 用户')}</h2>
                    <p class="profile-join-date">加入于 ${this.formatDate(user.createdAt)}</p>
                    <div class="profile-identity-list">
                        <span>${user.healthGoal ? '目标已设置' : '目标待完善'}</span>
                        <span>${user.aiPreferencePrompt ? '已启用个性化' : '默认回答风格'}</span>
                    </div>
                </aside>

                <main class="profile-main-grid">
                    <section class="profile-section profile-ai-card">
                        <div class="profile-section-head">
                            <div>
                                <p class="page-kicker">AI Personalization</p>
                                <h3 class="section-title">全局 AI 个性化</h3>
                                <p>它会影响 AI 回答风格、偏好和输出方式，但不能覆盖安全边界。</p>
                            </div>
                        </div>
                        <textarea
                            id="aiPreferencePrompt"
                            class="profile-ai-textarea"
                            maxlength="${this.aiPreferenceLimit}"
                            placeholder="例如：请用简洁直接的语气回答；先给结论，再给步骤；称呼我为……">${this.escapeHtml(user.aiPreferencePrompt || '')}</textarea>
                        <div class="profile-ai-footer">
                            <span id="aiPreferenceCount">${(user.aiPreferencePrompt || '').length}/${this.aiPreferenceLimit}</span>
                            <div>
                                <button class="btn btn-text profile-reset-ai-btn" type="button" onclick="ProfilePage.resetAiPreference()">恢复默认</button>
                                <button class="save-btn profile-save-ai-btn" type="button" onclick="ProfilePage.saveAiPreference()">保存</button>
                            </div>
                        </div>
                    </section>

                    <section class="profile-section profile-health-card">
                        <div class="profile-section-head">
                            <div>
                                <h3 class="section-title">健康档案</h3>
                                <p>体重来自 Records 的每日记录；这里仅维护长期档案和 AI 安全边界。</p>
                            </div>
                            <button class="btn btn-text profile-edit-btn" onclick="ProfilePage.showEditForm()">编辑档案</button>
                        </div>
                        <div id="health-tags-container">
                            ${this.renderHealthSummary(user)}
                        </div>
                    </section>
                </main>
            </div>
        `;
        this.bindAiPreference();
    },

    bindAiPreference() {
        const textarea = document.getElementById('aiPreferencePrompt');
        if (!textarea) return;
        textarea.addEventListener('input', () => this.updateAiPreferenceCount());
        this.updateAiPreferenceCount();
    },

    renderHealthSummary(user) {
        return `
            <div class="profile-health-grid">
                <div><span>身高</span><strong>${this.formatNumber(user.height)}<small>cm</small></strong></div>
                <div><span>最新体重</span><strong>${this.formatNumber(user.weight)}<small>kg</small></strong></div>
                <div><span>健康目标</span><p>${this.escapeHtml(user.healthGoal || '未填写')}</p></div>
                <div class="profile-health-history"><span>病史 / 健康限制</span><p>${this.escapeHtml(user.medicalHistory || '未填写')}</p></div>
            </div>
        `;
    },

    showEditForm() {
        const user = this.user;
        if (!user) return;

        const container = document.getElementById('health-tags-container');
        if (!container) return;

        container.innerHTML = `
            <div class="profile-edit-form">
                <div class="profile-readonly-row">
                    <span>最新体重</span>
                    <strong>${this.formatNumber(user.weight)} kg</strong>
                    <small>请在 Records 中更新体重</small>
                </div>
                <div class="form-group">
                    <label>身高 (cm)</label>
                    <input type="number" id="editHeight" value="${this.escapeAttr(user.height || '')}" step="0.1" min="50" max="250">
                </div>
                <div class="form-group">
                    <label>健康目标</label>
                    <input id="editHealthGoal" value="${this.escapeAttr(user.healthGoal || '')}" maxlength="100" placeholder="例如：提升体能、减脂、稳定睡眠">
                </div>
                <div class="form-group">
                    <label>病史 / 健康限制 (可填写“无”)</label>
                    <textarea id="editHistory" placeholder="请如实填写，AI 指导师将据此调整安全边界">${this.escapeHtml(user.medicalHistory || '')}</textarea>
                </div>
                <button class="save-btn" onclick="ProfilePage.saveProfile()">保存</button>
                <button class="btn btn-text profile-cancel-btn" onclick="ProfilePage.render()">取消</button>
            </div>
        `;
    },

    async saveProfile() {
        const height = document.getElementById('editHeight')?.value;
        const healthGoal = document.getElementById('editHealthGoal')?.value || '';
        const medicalHistory = document.getElementById('editHistory')?.value || '';
        const btn = document.querySelector('.profile-edit-form .save-btn');

        const heightValue = height?.trim();
        const parsedHeight = heightValue ? Number(heightValue) : null;
        if (!heightValue) {
            Toast.show('身高不能为空');
            return;
        }
        if (heightValue && (Number.isNaN(parsedHeight) || parsedHeight < 50 || parsedHeight > 250)) {
            Toast.show('身高范围50-250cm');
            return;
        }
        if (healthGoal.length > 100) {
            Toast.show('健康目标最多100个字符');
            return;
        }
        if (!medicalHistory.trim()) {
            Toast.show('病史不能为空，可填写“无”');
            return;
        }
        if (medicalHistory.length > 2000) {
            Toast.show('病史最多2000个字符');
            return;
        }

        if (btn) { btn.disabled = true; btn.classList.add('btn-loading'); }

        try {
            await apiClient.put('/user/profile', {
                height: parsedHeight,
                healthGoal: healthGoal.trim(),
                medicalHistory
            });
            Toast.show('保存成功');
            await this.render();
        } catch (e) {
            Toast.show('保存失败: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.classList.remove('btn-loading'); }
        }
    },

    async saveAiPreference() {
        const textarea = document.getElementById('aiPreferencePrompt');
        const btn = document.querySelector('.profile-save-ai-btn');
        if (!textarea) return;
        const prompt = textarea.value.trim();
        if (prompt.length > this.aiPreferenceLimit) {
            Toast.show(`AI 个性化最多${this.aiPreferenceLimit}个字符`);
            return;
        }
        await this.persistAiPreference(prompt, btn);
    },

    async resetAiPreference() {
        const textarea = document.getElementById('aiPreferencePrompt');
        const btn = document.querySelector('.profile-reset-ai-btn');
        if (textarea) textarea.value = '';
        this.updateAiPreferenceCount();
        await this.persistAiPreference('', btn, '已恢复默认');
    },

    async persistAiPreference(prompt, btn, successMessage = 'AI 个性化已保存') {
        if (btn) { btn.disabled = true; btn.classList.add('btn-loading'); }
        try {
            await apiClient.put('/user/profile', { aiPreferencePrompt: prompt });
            this.user = { ...(this.user || {}), aiPreferencePrompt: prompt };
            this.updateAiPreferenceCount();
            Toast.show(successMessage);
        } catch (e) {
            Toast.show('保存失败: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.classList.remove('btn-loading'); }
        }
    },

    updateAiPreferenceCount() {
        const textarea = document.getElementById('aiPreferencePrompt');
        const count = document.getElementById('aiPreferenceCount');
        if (!textarea || !count) return;
        count.textContent = `${textarea.value.length}/${this.aiPreferenceLimit}`;
    },

    logout() {
        apiClient.setToken(null);
        PageRouter.navigate('auth');
    },

    formatNumber(value) {
        if (value === null || value === undefined || value === '') return '--';
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return this.escapeHtml(String(value));
        return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
    },

    formatDate(dateValue) {
        if (!dateValue) return '--';
        try {
            if (Array.isArray(dateValue)) {
                const [year, month, day] = dateValue;
                return `${year}年${String(month).padStart(2, '0')}月${String(day).padStart(2, '0')}日`;
            }
            const d = new Date(dateValue);
            if (isNaN(d.getTime())) return '--';
            return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`;
        } catch (e) {
            return '--';
        }
    },

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    escapeAttr(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
};
