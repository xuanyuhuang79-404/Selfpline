const PlansPage = {
    filters: {
        status: '',
        direction: '',
        keyword: ''
    },
    plans: [],
    pendingIds: new Set(),

    async render() {
        this.showShell();
        document.getElementById('page-container').innerHTML = `
            <div class="workspace-page plans-page">
                <section class="workspace-hero plans-hero">
                    <div>
                        <p class="page-kicker">Plans</p>
                        <h1>管理所有计划</h1>
                        <p>在这里筛选、搜索、编辑、结束和删除计划。Today 只负责今天，Plans 负责长期管理。</p>
                    </div>
                    <button class="btn btn-primary workspace-hero-action" type="button" onclick="PageRouter.navigate('create-plan')">创建计划</button>
                </section>

                <section class="workspace-card plans-toolbar">
                    <div class="plans-filter-grid">
                        <div class="plans-filter-group">
                            <span>方向</span>
                            <div class="plans-filter-segment" id="plans-filter-direction" role="group" aria-label="方向筛选">
                                <button type="button" data-value="">全部</button>
                                <button type="button" data-value="1">Build</button>
                                <button type="button" data-value="2">Quit</button>
                            </div>
                        </div>
                        <div class="plans-filter-group">
                            <span>状态</span>
                            <div class="plans-filter-segment" id="plans-filter-status" role="group" aria-label="状态筛选">
                                <button type="button" data-value="">全部</button>
                                <button type="button" data-value="1">执行中</button>
                                <button type="button" data-value="2">已完成</button>
                                <button type="button" data-value="3">已结束</button>
                            </div>
                        </div>
                        <label class="plans-search-label">
                            <span>关键词</span>
                            <div class="plans-search-control">
                                <span class="plans-search-icon">⌕</span>
                                <input id="plans-filter-keyword" type="search" maxlength="60" placeholder="搜索目标或短名">
                                <button id="plans-filter-clear" class="plans-search-clear hidden" type="button" aria-label="清空关键词">×</button>
                            </div>
                        </label>
                        <button class="btn btn-primary plans-filter-btn" id="plans-filter-submit" type="button">筛选</button>
                    </div>
                </section>

                <section class="plans-list" id="plans-list">
                    <div class="panel-loading">加载中...</div>
                </section>
                <div id="plans-modal-root"></div>
            </div>
        `;

        this.bindFilters();
        await this.loadPlans();
    },

    showShell() {
        document.getElementById('top-nav').classList.remove('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');
        document.getElementById('fab-add-habit').classList.add('hidden');
    },

    bindFilters() {
        const keyword = document.getElementById('plans-filter-keyword');
        if (keyword) keyword.value = this.filters.keyword;
        this.updateClearButton();
        this.syncSegment('plans-filter-direction', this.filters.direction);
        this.syncSegment('plans-filter-status', this.filters.status);

        document.querySelectorAll('#plans-filter-direction [data-value], #plans-filter-status [data-value]').forEach(button => {
            button.addEventListener('click', () => {
                const group = button.closest('.plans-filter-segment');
                if (!group) return;
                const key = group.id === 'plans-filter-direction' ? 'direction' : 'status';
                this.filters[key] = button.dataset.value || '';
                this.syncSegment(group.id, this.filters[key]);
                this.loadPlans();
            });
        });

        document.getElementById('plans-filter-submit')?.addEventListener('click', () => {
            this.filters = {
                direction: this.filters.direction || '',
                status: this.filters.status || '',
                keyword: keyword?.value?.trim() || ''
            };
            this.updateClearButton();
            this.loadPlans();
        });
        document.getElementById('plans-filter-clear')?.addEventListener('click', () => {
            if (keyword) keyword.value = '';
            this.filters.keyword = '';
            this.updateClearButton();
            this.loadPlans();
        });
        keyword?.addEventListener('input', () => this.updateClearButton());
        keyword?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                document.getElementById('plans-filter-submit')?.click();
            }
        });
    },

    updateClearButton() {
        const keyword = document.getElementById('plans-filter-keyword');
        const clear = document.getElementById('plans-filter-clear');
        clear?.classList.toggle('hidden', !(keyword?.value || '').trim());
    },

    syncSegment(id, value) {
        document.querySelectorAll(`#${id} [data-value]`).forEach(button => {
            button.classList.toggle('active', (button.dataset.value || '') === (value || ''));
        });
    },

    async loadPlans() {
        const container = document.getElementById('plans-list');
        if (!container) return;
        container.innerHTML = '<div class="panel-loading">加载中...</div>';
        try {
            const params = new URLSearchParams();
            if (this.filters.status) params.set('status', this.filters.status);
            if (this.filters.direction) params.set('direction', this.filters.direction);
            if (this.filters.keyword) params.set('keyword', this.filters.keyword);
            const result = await apiClient.get('/plan/list' + (params.toString() ? `?${params}` : ''));
            this.plans = Array.isArray(result.data) ? result.data : [];
            this.renderList();
        } catch (e) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-title">计划加载失败</div>
                    <div class="empty-desc">${this.escapeHtml(e.message || '请稍后重试')}</div>
                    <button class="empty-cta" onclick="PlansPage.loadPlans()">重试</button>
                </div>
            `;
        }
    },

    renderList() {
        const container = document.getElementById('plans-list');
        if (!container) return;
        if (!this.plans.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">✨</div>
                    <div class="empty-title">没有匹配的计划</div>
                    <div class="empty-desc">调整筛选条件，或创建一个新的 Build / Quit 计划。</div>
                    <button class="empty-cta" onclick="PageRouter.navigate('create-plan')">创建计划</button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.plans.map(plan => this.renderPlanCard(plan)).join('');
    },

    renderPlanCard(plan) {
        const direction = Number(plan.planDirection) === 2 ? 'Quit' : 'Build';
        const directionClass = Number(plan.planDirection) === 2 ? 'quit' : 'build';
        const status = this.getStatus(plan.status);
        const isPending = this.pendingIds.has(plan.planId);
        const color = this.getSafeColor(plan.themeColor, directionClass === 'quit' ? '#e9340b' : '#37c978');
        return `
            <article class="workspace-card plan-manage-card ${directionClass}" style="--plan-accent:${color}">
                <div class="plan-manage-main">
                    <span class="plan-manage-icon">${this.escapeHtml(plan.icon || '📋')}</span>
                    <div class="plan-manage-copy">
                        <div class="plan-manage-title-row">
                            <h2>${this.escapeHtml(plan.shortName || plan.targetName || '未命名计划')}</h2>
                            <span class="status-pill ${status.className}">${status.label}</span>
                        </div>
                        ${plan.targetName && plan.targetName !== plan.shortName ? `<p>${this.escapeHtml(plan.targetName)}</p>` : ''}
                        <div class="plan-manage-meta">
                            <span>${direction}</span>
                            <span>连续 ${plan.streakDays || 0} 天</span>
                            <span>完成 ${plan.completedDays || 0} 天</span>
                            <span>${this.escapeHtml(plan.startDate || '--')}</span>
                        </div>
                    </div>
                </div>
                <div class="plan-manage-actions">
                    <button type="button" class="workspace-link-btn" onclick="PageRouter.navigate('plan-detail', { planId: ${plan.planId} })">详情</button>
                    <button type="button" class="workspace-link-btn" onclick="PlansPage.openEdit(${plan.planId})" ${isPending ? 'disabled' : ''}>编辑</button>
                    ${this.renderStatusAction(plan, isPending)}
                    <button type="button" class="workspace-danger-btn" onclick="PlansPage.deletePlan(${plan.planId})" ${isPending ? 'disabled' : ''}>删除</button>
                </div>
            </article>
        `;
    },

    renderStatusAction(plan, isPending) {
        if (Number(plan.status) === 3) {
            return `<button type="button" class="workspace-link-btn" onclick="PlansPage.restorePlan(${plan.planId})" ${isPending ? 'disabled' : ''}>恢复</button>`;
        }
        return `<button type="button" class="workspace-link-btn" onclick="PlansPage.archivePlan(${plan.planId})" ${isPending ? 'disabled' : ''}>结束</button>`;
    },

    openEdit(planId) {
        const plan = this.plans.find(item => Number(item.planId) === Number(planId));
        if (!plan) return;
        const modal = document.getElementById('plans-modal-root');
        if (!modal) return;
        const color = this.getSafeColor(plan.themeColor, '#ff7a3d');
        modal.innerHTML = `
            <div class="workspace-modal-overlay" role="dialog" aria-modal="true">
                <form class="workspace-modal plan-edit-modal" id="plan-edit-form">
                    <div class="workspace-modal-head">
                        <h2>编辑计划</h2>
                        <button type="button" aria-label="关闭" onclick="PlansPage.closeEdit()">×</button>
                    </div>
                    <div class="plan-edit-grid">
                        <label>
                            <span>目标名称</span>
                            <input id="edit-target-name" maxlength="100" value="${this.escapeAttr(plan.targetName || '')}">
                        </label>
                        <label>
                            <span>短名</span>
                            <input id="edit-short-name" maxlength="40" value="${this.escapeAttr(plan.shortName || '')}">
                        </label>
                        <label>
                            <span>方向</span>
                            <select id="edit-direction">
                                <option value="1" ${Number(plan.planDirection) === 1 ? 'selected' : ''}>Build</option>
                                <option value="2" ${Number(plan.planDirection) === 2 ? 'selected' : ''}>Quit</option>
                            </select>
                        </label>
                        <label>
                            <span>状态</span>
                            <select id="edit-status">
                                <option value="1" ${Number(plan.status) === 1 ? 'selected' : ''}>执行中</option>
                                <option value="2" ${Number(plan.status) === 2 ? 'selected' : ''}>已完成</option>
                                <option value="3" ${Number(plan.status) === 3 ? 'selected' : ''}>已结束</option>
                            </select>
                        </label>
                        <label>
                            <span>主题色</span>
                            <input id="edit-theme-color" type="color" value="${color}">
                        </label>
                        <label>
                            <span>图标</span>
                            <input id="edit-icon" maxlength="50" value="${this.escapeAttr(plan.icon || '📋')}">
                        </label>
                    </div>
                    <label class="plan-content-label">
                        <span>计划内容</span>
                        <textarea id="edit-plan-content" rows="8">${this.escapeHtml(plan.planContent || '')}</textarea>
                    </label>
                    <div class="workspace-modal-actions">
                        <button type="button" class="btn btn-text" onclick="PlansPage.closeEdit()">取消</button>
                        <button type="submit" class="btn btn-primary" id="plan-edit-submit">保存</button>
                    </div>
                </form>
            </div>
        `;
        document.getElementById('plan-edit-form')?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.saveEdit(planId);
        });
    },

    closeEdit() {
        const modal = document.getElementById('plans-modal-root');
        if (modal) modal.innerHTML = '';
    },

    async saveEdit(planId) {
        const targetName = document.getElementById('edit-target-name')?.value?.trim() || '';
        const shortName = document.getElementById('edit-short-name')?.value?.trim() || '';
        if (!targetName) {
            Toast.show('计划目标不能为空');
            return;
        }
        const btn = document.getElementById('plan-edit-submit');
        if (btn) {
            btn.disabled = true;
            btn.classList.add('btn-loading');
        }
        try {
            await apiClient.put(`/plan/${planId}`, {
                targetName,
                shortName,
                planDirection: Number(document.getElementById('edit-direction')?.value || 1),
                status: Number(document.getElementById('edit-status')?.value || 1),
                themeColor: document.getElementById('edit-theme-color')?.value || '#ff7a3d',
                icon: document.getElementById('edit-icon')?.value?.trim() || '📋',
                planContent: document.getElementById('edit-plan-content')?.value || ''
            });
            Toast.show('计划已保存');
            this.closeEdit();
            await this.loadPlans();
        } catch (e) {
            Toast.show('保存失败: ' + e.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('btn-loading');
            }
        }
    },

    async archivePlan(planId) {
        if (!confirm('确定结束这个计划吗？结束后不会出现在 Today。')) return;
        await this.runPlanAction(planId, `/plan/${planId}/archive`, '计划已结束');
    },

    async restorePlan(planId) {
        await this.runPlanAction(planId, `/plan/${planId}/restore`, '计划已恢复');
    },

    async deletePlan(planId) {
        if (!confirm('确定删除这个计划吗？系统会彻底删除计划，并清理对应每日执行记录。')) return;
        await this.runPlanAction(planId, `/plan/${planId}`, '计划已删除', 'DELETE');
    },

    async runPlanAction(planId, path, successMessage, method = 'POST') {
        if (this.pendingIds.has(planId)) return;
        this.pendingIds.add(planId);
        this.renderList();
        try {
            if (method === 'DELETE') {
                await apiClient.delete(path);
            } else {
                await apiClient.post(path);
            }
            Toast.show(successMessage);
            await this.loadPlans();
        } catch (e) {
            Toast.show('操作失败: ' + e.message);
        } finally {
            this.pendingIds.delete(planId);
            this.renderList();
        }
    },

    getStatus(statusCode) {
        const map = {
            0: { label: '已删除', className: 'deleted' },
            1: { label: '执行中', className: 'active' },
            2: { label: '已完成', className: 'completed' },
            3: { label: '已结束', className: 'archived' }
        };
        return map[Number(statusCode)] || map[1];
    },

    getSafeColor(color, fallback) {
        return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color || '') ? color : fallback;
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
    }
};
