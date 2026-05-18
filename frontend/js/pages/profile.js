// 个人中心设置页面
const ProfilePage = {
    user: null,

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
                <div class="profile-stats">
                    <div class="profile-stat">
                        <div class="skeleton skeleton-text profile-skeleton-line tiny"></div>
                        <div class="skeleton skeleton-text profile-skeleton-line short"></div>
                    </div>
                    <div class="profile-stat">
                        <div class="skeleton skeleton-text profile-skeleton-line tiny"></div>
                        <div class="skeleton skeleton-text profile-skeleton-line short"></div>
                    </div>
                    <div class="profile-stat">
                        <div class="skeleton skeleton-text profile-skeleton-line tiny"></div>
                        <div class="skeleton skeleton-text profile-skeleton-line short"></div>
                    </div>
                </div>
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
        `;

        await this.loadProfile();
    },

    async loadProfile() {
        try {
            const userResult = await apiClient.get('/user/profile');
            const user = userResult.data;
            this.user = user;

            let activePlanCount = 0;
            try {
                const plansResult = await apiClient.get('/plan/dashboard');
                const plans = plansResult.data || [];
                activePlanCount = Array.isArray(plans) ? plans.length : 0;
            } catch (e) {
                // Dashboard fetch失败时，计划数显示为0
            }

            const checkinDays = 0;

            this.renderProfile(user, activePlanCount, checkinDays);
        } catch (e) {
            document.getElementById('page-container').innerHTML = `
                <div class="profile-page">
                    <div class="empty-state">
                        <div class="empty-icon">😞</div>
                        <div class="empty-title">加载失败</div>
                        <div class="empty-desc">${e.message}</div>
                        <button class="empty-cta" onclick="ProfilePage.render()">重试</button>
                    </div>
                </div>
            `;
        }
    },

    renderProfile(user, activePlanCount, checkinDays) {
        document.getElementById('page-container').innerHTML = `
            <div class="profile-page">
                <div class="profile-header">
                    <button class="profile-logout-inline" onclick="ProfilePage.logout()">退出登录</button>
                    <div class="profile-avatar">🏃</div>
                    <h2 class="profile-username">${this.escapeHtml(user.username)}</h2>
                    <p class="profile-join-date">加入于 ${this.formatDate(user.createdAt)}</p>
                    <div class="profile-identity-list">
                        <span>Web 工作台用户</span>
                        <span>健康档案已连接</span>
                    </div>
                </div>
                <div class="profile-stats">
                    <div class="profile-stat">
                        <span class="stat-value">${activePlanCount}</span>
                        <span class="stat-label">进行中计划</span>
                    </div>
                    <div class="profile-stat">
                        <span class="stat-value">${checkinDays || 0}</span>
                        <span class="stat-label">累计打卡</span>
                    </div>
                    <div class="profile-stat">
                        <span class="stat-value">0</span>
                        <span class="stat-label">当前成长值</span>
                    </div>
                </div>
                <div class="profile-section profile-health-card">
                    <h3 class="section-title">健康档案</h3>
                    <div class="health-tags" id="health-tags-container">
                        <div class="profile-health-grid">
                            <div><span>身高</span><strong>${user.height || '--'}<small>cm</small></strong></div>
                            <div><span>最新体重</span><strong>${user.weight || '--'}<small>kg</small></strong></div>
                            <div class="profile-health-history"><span>病史</span><p>${this.escapeHtml(user.medicalHistory || '未填写')}</p></div>
                        </div>
                    </div>
                    <button class="btn btn-text profile-edit-btn" onclick="ProfilePage.showEditForm()">编辑档案</button>
                </div>
                <div class="profile-section profile-settings-grid">
                    <article>
                        <h3 class="section-title">账号与安全</h3>
                        <p>当前账号使用登录令牌保护。退出登录会清除本机令牌。</p>
                        <button class="workspace-link-btn" type="button" onclick="ProfilePage.logout()">退出登录</button>
                    </article>
                    <article>
                        <h3 class="section-title">使用偏好</h3>
                        <p>偏好轻量记录、AI 计划生成和每日复盘工作流。</p>
                    </article>
                    <article>
                        <h3 class="section-title">数据管理</h3>
                        <p>健康记录按日期保存，同一天更新，不同日期独立保留。</p>
                    </article>
                    <article>
                        <h3 class="section-title">成长值</h3>
                        <p>当前成长值为 0，后续会接入更完整的积分规则。</p>
                    </article>
                </div>
                <div class="profile-section">
                    <h3 class="section-title">通知</h3>
                    <div id="notificationList" class="notification-center">
                        <div class="notification-empty">加载中...</div>
                    </div>
                </div>
            </div>
        `;

        this.loadNotifications();
    },

    showEditForm() {
        const user = this.user;
        if (!user) return;

        const container = document.getElementById('health-tags-container');
        if (!container) return;

        container.innerHTML = `
            <div class="profile-edit-form">
                <div class="form-group">
                    <label>身高 (cm)</label>
                    <input type="number" id="editHeight" value="${user.height || ''}" step="0.1" min="50" max="250">
                </div>
                <div class="form-group">
                    <label>体重 (kg)</label>
                    <input type="number" id="editWeight" value="${user.weight || ''}" step="0.1" min="20" max="300">
                </div>
                <div class="form-group">
                    <label>病史 (可填写“无”)</label>
                    <textarea id="editHistory" placeholder="请如实填写，AI 指导师将据此调整安全边界">${this.escapeHtml(user.medicalHistory) || ''}</textarea>
                </div>
                <button class="save-btn" onclick="ProfilePage.saveProfile()">保存</button>
                <button class="btn btn-text profile-cancel-btn" onclick="ProfilePage.render()">取消</button>
            </div>
        `;
    },

    async saveProfile() {
        const height = document.getElementById('editHeight')?.value;
        const weight = document.getElementById('editWeight')?.value;
        const medicalHistory = document.getElementById('editHistory')?.value;
        const btn = document.querySelector('.profile-edit-form .save-btn');

        const heightValue = height?.trim();
        const weightValue = weight?.trim();
        const parsedHeight = heightValue ? Number(heightValue) : null;
        const parsedWeight = weightValue ? Number(weightValue) : null;
        if (!heightValue) {
            Toast.show('身高不能为空');
            return;
        }
        if (!weightValue) {
            Toast.show('体重不能为空');
            return;
        }
        if (heightValue && (Number.isNaN(parsedHeight) || parsedHeight < 50 || parsedHeight > 250)) {
            Toast.show('身高范围50-250cm');
            return;
        }
        if (weightValue && (Number.isNaN(parsedWeight) || parsedWeight < 20 || parsedWeight > 300)) {
            Toast.show('体重范围20-300kg');
            return;
        }
        if (!(medicalHistory || '').trim()) {
            Toast.show('病史不能为空，可填写“无”');
            return;
        }
        if ((medicalHistory || '').length > 2000) {
            Toast.show('病史最多2000个字符');
            return;
        }

        if (btn) { btn.disabled = true; btn.classList.add('btn-loading'); }

        try {
            await apiClient.put('/user/profile', {
                height: parsedHeight,
                weight: parsedWeight,
                medicalHistory: medicalHistory || ''
            });
            Toast.show('保存成功');
            await this.render();
        } catch (e) {
            Toast.show('保存失败: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.classList.remove('btn-loading'); }
        }
    },

    logout() {
        apiClient.setToken(null);
        PageRouter.navigate('auth');
    },

    async loadNotifications() {
        const container = document.getElementById('notificationList');
        if (!container) return;
        try {
            const result = await apiClient.get('/user/notifications');
            const list = result.data || [];
            if (!list || list.length === 0) {
                container.innerHTML = '<div class="notification-empty">暂无通知</div>';
                return;
            }
            container.innerHTML = list.map(n => `
                <div class="notification-item${n.isRead ? '' : ' unread'}">
                    <div class="notification-content">
                        <div class="notification-title">${this.escapeHtml(n.title) || ''}</div>
                        <div class="notification-body">${this.escapeHtml(n.content) || ''}</div>
                        <div class="notification-time">${this.formatDate(n.createTime)}</div>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            container.innerHTML = '<div class="notification-empty">暂无通知</div>';
        }
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
