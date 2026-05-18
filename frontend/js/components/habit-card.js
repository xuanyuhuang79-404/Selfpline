// 习惯卡片组件
const HabitCard = {
    pendingPlans: new Set(),

    render(plan) {
        const directionClass = plan.planDirection === 1 ? 'build' : 'quit';
        const badgeIcon = plan.planDirection === 1 ? '🌱' : '🚫';
        const accentColor = plan.themeColor || (plan.planDirection === 1 ? '#8BEA3C' : '#E9340B');
        const displayName = this.escapeHtml(plan.shortName || plan.targetName || '未命名计划');
        const fullName = this.escapeHtml(plan.targetName || plan.shortName || '未命名计划');
        const icon = this.escapeHtml(plan.icon || '📋');

        return `
            <div class="habit-card ${directionClass}${plan.todayCompleted ? ' completed' : ''}"
                 style="--card-accent: ${accentColor};"
                 title="${fullName}"
                 onclick="HabitCard.onClick(${plan.planId})">
                <span class="card-icon">${icon}</span>
                <div class="card-info">
                    <div class="card-name">${displayName}</div>
                    <div class="card-streak">🔥 ${plan.streakDays || 0} 天连续</div>
                </div>
                <span class="card-badge">${badgeIcon}</span>
                ${this.renderAction(plan)}
                ${directionClass === 'build' ? `<div class="card-progress-bar" style="width:${plan.progressPercent || 0}%"></div>` : ''}
            </div>
        `;
    },

    renderAction(plan) {
        const completed = Boolean(plan.todayCompleted);
        const disabled = this.pendingPlans.has(plan.planId) ? 'disabled' : '';
        return `<button type="button" class="card-action checkbox-action${completed ? ' checked' : ''}" ${disabled} title="${completed ? '取消今日完成' : '今日完成'}" aria-label="${completed ? '取消今日完成' : '今日完成'}" onclick="event.stopPropagation(); HabitCard.quickCheck(${plan.planId}, ${completed}, event.currentTarget)">${completed ? '✓' : '○'}</button>`;
    },

    onClick(planId) {
        // 跳转计划详情页
        PageRouter.navigate('plan-detail', { planId });
    },

    async quickCheck(planId, currentCompleted = false, button) {
        if (this.pendingPlans.has(planId)) return;
        const nextCompleted = !currentCompleted;
        this.pendingPlans.add(planId);
        if (button) button.disabled = true;

        try {
            await apiClient.post('/plan/daily-log', {
                planId: planId,
                isCompleted: nextCompleted,
                actualValue: nextCompleted ? 1 : 0,
                targetValue: 1,
                notes: '快速打卡'
            });
            Toast.show(nextCompleted ? '今日计划已完成' : '今日计划已取消完成');
            // Refresh cards to show updated state
            if (typeof HomePage !== 'undefined' && HomePage.loadCards) {
                HomePage.loadCards();
            }
        } catch (e) {
            Toast.show('计划操作失败: ' + e.message);
            if (button) button.disabled = false;
        } finally {
            this.pendingPlans.delete(planId);
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
};
