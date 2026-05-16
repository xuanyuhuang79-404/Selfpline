// 健康打卡页面
const HealthCheckinPage = {
    completedPlanIds: [],
    activePlans: [],

    async render() {
        document.getElementById('top-nav').classList.remove('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');
        document.getElementById('fab-add-habit').classList.add('hidden');

        document.getElementById('page-container').innerHTML = `
            <div class="checkin-page">
                <section class="checkin-header">
                    <div>
                        <p class="page-kicker">健康打卡</p>
                        <h1>记录今天的身体状态</h1>
                        <p>同步体重、热量、睡眠和计划完成情况，帮助 AI 指导师理解你的执行状态。</p>
                    </div>
                </section>

                <div class="checkin-form">
                <div class="checkin-card">
                    <h3>📏 体重 (kg)</h3>
                    <div class="slider-group">
                        <input type="range" id="weight-slider" min="30" max="200" value="70" step="0.1">
                        <span class="slider-value" id="weight-value">70.0</span>
                    </div>
                </div>

                <div class="checkin-card">
                    <h3>🍔 摄入卡路里 (kcal)</h3>
                    <div class="slider-group">
                        <input type="range" id="calories-in-slider" min="0" max="5000" value="2000" step="50">
                        <span class="slider-value" id="calories-in-value">2000</span>
                    </div>
                </div>

                <div class="checkin-card">
                    <h3>🔥 消耗卡路里 (kcal)</h3>
                    <div class="slider-group">
                        <input type="range" id="calories-out-slider" min="0" max="5000" value="500" step="50">
                        <span class="slider-value" id="calories-out-value">500</span>
                    </div>
                </div>

                <div class="checkin-card">
                    <h3>😴 睡眠时长 (小时)</h3>
                    <div class="slider-group">
                        <input type="range" id="sleep-slider" min="0" max="12" value="7.5" step="0.5">
                        <span class="slider-value" id="sleep-value">7.5</span>
                    </div>
                </div>

                <div class="checkin-card plan-checkin-card">
                    <h3>今日计划</h3>
                    <div id="planChecklist">
                        <div class="plan-check-placeholder">加载中...</div>
                    </div>
                </div>

                <button class="btn btn-primary" id="btn-submit-checkin">提交今日打卡</button>
                </div>
            </div>
        `;

        this.bindSliders();
        this.loadPlans();
        document.getElementById('btn-submit-checkin').addEventListener('click', () => this.submit());
    },

    bindSliders() {
        [
            ['weight-slider', 'weight-value'],
            ['calories-in-slider', 'calories-in-value'],
            ['calories-out-slider', 'calories-out-value'],
            ['sleep-slider', 'sleep-value']
        ].forEach(([sliderId, valueId]) => {
            const slider = document.getElementById(sliderId);
            const value = document.getElementById(valueId);
            slider.addEventListener('input', () => { value.textContent = slider.value; });
        });
    },

    async submit() {
        // Collect checked plan IDs
        this.completedPlanIds = [];
        document.querySelectorAll('.check-icon').forEach(icon => {
            if (icon.textContent === '☑') {
                const planId = icon.closest('.plan-check-item').dataset.planId;
                if (planId) this.completedPlanIds.push(parseInt(planId));
            }
        });

        const btn = document.querySelector('#btn-submit-checkin');
        if (btn) { btn.disabled = true; btn.classList.add('btn-loading'); }

        try {
            await apiClient.post('/health/daily-record', {
                recordDate: new Date().toISOString().split('T')[0],
                currentWeight: parseFloat(document.getElementById('weight-slider').value),
                caloriesIntake: parseInt(document.getElementById('calories-in-slider').value),
                caloriesBurned: parseInt(document.getElementById('calories-out-slider').value),
                sleepHours: parseFloat(document.getElementById('sleep-slider').value),
                completedPlanIds: this.completedPlanIds
            });
            Toast.show('打卡成功！');
        } catch (e) {
            Toast.show('保存失败: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.classList.remove('btn-loading'); }
        }
    },

    async loadPlans() {
        const checklistContainer = document.getElementById('planChecklist');
        if (!checklistContainer) return;

        try {
            const result = await apiClient.get('/plan/dashboard');
            const plans = result.data || [];
            if (plans.length === 0) {
                checklistContainer.innerHTML = '<div class="plan-check-placeholder">今天没有进行中的计划</div>';
                return;
            }

            this.activePlans = plans;
            checklistContainer.innerHTML = plans.map(plan => `
                <div class="plan-check-item${plan.todayCompleted ? ' is-done' : ''}" data-plan-id="${plan.planId}">
                    <span class="check-icon" id="checkIcon-${plan.planId}"
                        onclick="HealthCheckinPage.togglePlanCheck(${plan.planId})">${plan.todayCompleted ? '☑' : '☐'}</span>
                    <span class="plan-name">${this.escapeHtml(plan.icon || '📋')} ${this.escapeHtml(plan.targetName || '未命名计划')}</span>
                    <span class="plan-status">${plan.todayCompleted ? '已完成' : '未打卡'}</span>
                </div>
            `).join('');
        } catch (e) {
            checklistContainer.innerHTML = `<div class="plan-check-placeholder">${this.escapeHtml(e.message || '加载失败')}</div>`;
        }
    },

    async togglePlanCheck(planId) {
        const icon = document.getElementById('checkIcon-' + planId);
        const isChecked = icon.textContent === '☑';

        // Optimistic update
        icon.textContent = isChecked ? '☐' : '☑';
        const item = icon.closest('.plan-check-item');
        const status = item?.querySelector('.plan-status');
        item?.classList.toggle('is-done', !isChecked);
        if (status) status.textContent = isChecked ? '未打卡' : '已完成';

        try {
            await apiClient.post('/plan/daily-log', {
                planId: planId,
                recordDate: new Date().toISOString().split('T')[0],
                isCompleted: !isChecked,
                actualValue: !isChecked ? 1 : 0,
                targetValue: 1,
                notes: '健康打卡时勾选'
            });
        } catch (e) {
            // Revert
            icon.textContent = isChecked ? '☑' : '☐';
            item?.classList.toggle('is-done', isChecked);
            if (status) status.textContent = isChecked ? '已完成' : '未打卡';
            Toast.show('操作失败: ' + e.message);
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
};
