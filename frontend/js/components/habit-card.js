// 习惯卡片组件
const HabitCard = {
    render(plan) {
        const directionClass = plan.planDirection === 1 ? 'build' : 'quit';
        const badgeIcon = plan.planDirection === 1 ? '🌱' : '🚫';
        const accentColor = plan.themeColor || (plan.planDirection === 1 ? '#8BEA3C' : '#E9340B');
        const targetName = this.escapeHtml(plan.targetName || '未命名计划');
        const icon = this.escapeHtml(plan.icon || '📋');

        return `
            <div class="habit-card ${directionClass}"
                 style="--card-accent: ${accentColor};"
                 onclick="HabitCard.onClick(${plan.planId})">
                <span class="card-icon">${icon}</span>
                <div class="card-info">
                    <div class="card-name">${targetName}</div>
                    <div class="card-streak">🔥 ${plan.streakDays || 0} 天连续</div>
                </div>
                <span class="card-badge">${badgeIcon}</span>
                ${this.renderAction(plan)}
                ${directionClass === 'build' ? `<div class="card-progress-bar" style="width:${plan.progressPercent || 0}%"></div>` : ''}
            </div>
        `;
    },

    renderAction(plan) {
        switch (plan.trackingMode) {
            case 1:
                return `<button type="button" class="card-action checkbox-action" title="快速打卡" aria-label="快速打卡" onclick="event.stopPropagation(); HabitCard.quickCheck(${plan.planId})">${plan.todayCompleted ? '✓' : '○'}</button>`;
            case 2:
                return `<button type="button" class="card-action timer-action" title="开始计时" aria-label="开始计时" onclick="event.stopPropagation(); HabitCard.startTimer(${plan.planId})">▶</button>`;
            case 3:
                return `<button type="button" class="card-action counter-action" title="快速加一" aria-label="快速加一" onclick="event.stopPropagation(); HabitCard.increment(${plan.planId})">+</button>`;
            default:
                return '';
        }
    },

    onClick(planId) {
        // 跳转计划详情页
        PageRouter.navigate('plan-detail', { planId });
    },

    async quickCheck(planId) {
        try {
            await apiClient.post('/plan/daily-log', {
                planId: planId,
                recordDate: new Date().toISOString().split('T')[0],
                isCompleted: true,
                actualValue: 1,
                targetValue: 1,
                notes: '快速打卡'
            });
            Toast.show('打卡成功！');
            // Refresh cards to show updated state
            if (typeof HomePage !== 'undefined' && HomePage.loadCards) {
                HomePage.loadCards();
            }
        } catch (e) {
            Toast.show('打卡失败: ' + e.message);
        }
    },

    startTimer(planId) {
        // Navigate to plan detail page which has the full timer
        PageRouter.navigate('plan-detail', { planId: planId });
    },

    async increment(planId) {
        try {
            // Quick increment: add 1 to today's counter
            await apiClient.post('/plan/daily-log', {
                planId: planId,
                recordDate: new Date().toISOString().split('T')[0],
                isCompleted: true,
                actualValue: 1,
                targetValue: 1,
                notes: '快速打卡'
            });
            Toast.show('+1');
            // Refresh the dashboard to update card display
            if (typeof HomePage !== 'undefined' && HomePage.loadCards) {
                HomePage.loadCards();
            }
        } catch (e) {
            Toast.show('操作失败: ' + e.message);
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
};
