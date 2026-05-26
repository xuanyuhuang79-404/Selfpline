// 每日活动记录追踪组件：当前阶段统一使用今日 checkbox 打卡
const DailyTracker = {
    planId: null,
    trackingMode: 1,
    checked: false,
    pending: false,

    init(planId, trackingMode, existingLog) {
        this.planId = planId;
        this.trackingMode = 1;
        this.checked = Boolean(existingLog && existingLog.isCompleted);
        this.pending = false;
        this.render();
    },

    render() {
        const container = this.getContainer();
        if (!container) return;
        container.className = 'tracker-component checkbox-mode';
        container.innerHTML = `
            <button
                type="button"
                class="check-circle${this.checked ? ' checked' : ''}"
                ${this.pending ? 'disabled' : ''}
                aria-label="${this.checked ? '取消今日完成' : '标记今日完成'}"
                onclick="DailyTracker.toggleCheck()">✓</button>
            <span class="check-status-text">${this.checked ? '今日已完成' : '点击完成今天的计划'}</span>
        `;
    },

    async toggleCheck() {
        if (this.pending || !this.planId) return;

        const previous = this.checked;
        const next = !previous;
        this.checked = next;
        this.pending = true;
        this.render();

        try {
            await this.submitLog(next);
            Toast.show(next ? '今日计划已完成' : '今日计划已取消完成');
            if (typeof PlanDetailPage !== 'undefined' && PlanDetailPage.handleTodayCheckChanged) {
                PlanDetailPage.handleTodayCheckChanged(this.planId, next);
            }
        } catch (e) {
            this.checked = previous;
            Toast.show('保存失败: ' + e.message);
        } finally {
            this.pending = false;
            this.render();
        }
    },

    async submitLog(isCompleted) {
        await apiClient.post('/plan/daily-log', {
            planId: this.planId,
            isCompleted: isCompleted,
            actualValue: isCompleted ? 1 : 0,
            targetValue: 1
        });
    },

    getContainer() {
        return document.getElementById('trackerContainer') || document.getElementById('tracker-container');
    }
};
