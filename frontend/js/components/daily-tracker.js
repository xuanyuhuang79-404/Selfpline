// 每日活动记录追踪组件
const DailyTracker = {
    planId: null,
    trackingMode: 1,
    // Timer state
    timerRunning: false,
    timerSeconds: 0,
    timerInterval: null,
    // Counter state
    counterValue: 0,
    counterTarget: 1,

    init(planId, trackingMode, existingLog) {
        this.planId = planId;
        this.trackingMode = trackingMode;
        // Reset states
        this.stopTimer();
        this.timerSeconds = 0;
        this.counterValue = 0;
        this.counterTarget = 1;

        // If there's an existing log for today, pre-populate
        if (existingLog) {
            if (trackingMode === 2 && existingLog.actualValue != null) {
                this.timerSeconds = Math.round(existingLog.actualValue * 60); // stored as minutes
            }
            if (trackingMode === 3) {
                this.counterValue = existingLog.actualValue != null ? Math.round(existingLog.actualValue) : 0;
                this.counterTarget = existingLog.targetValue != null ? Math.round(existingLog.targetValue) : 1;
            }
        }
        this.render();
    },

    render() {
        const container = this.getContainer();
        if (!container) return;

        container.className = 'tracker-component';
        switch (this.trackingMode) {
            case 1: this.renderCheckbox(); break;
            case 2: this.renderTimer(); break;
            case 3: this.renderCounter(); break;
        }
    },

    renderCheckbox() {
        const container = this.getContainer();
        if (!container) return;
        container.classList.add('checkbox-mode');
        container.innerHTML = `
            <div class="check-circle" onclick="DailyTracker.toggleCheck()">✓</div>
        `;
    },

    renderTimer() {
        const container = this.getContainer();
        if (!container) return;
        container.classList.add('timer-mode');
        const mins = Math.floor(this.timerSeconds / 60);
        const secs = this.timerSeconds % 60;
        const display = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
        const isRunning = this.timerRunning;

        container.innerHTML = `
            <div class="timer-mode">
                <div class="timer-display">${display}</div>
                <div class="timer-controls">
                    ${!isRunning ? `<button class="counter-btn" onclick="DailyTracker.startTimer()">▶ 开始</button>` : ''}
                    ${isRunning ? `<button class="counter-btn" onclick="DailyTracker.pauseTimer()">⏸ 暂停</button>` : ''}
                    <button class="counter-btn" onclick="DailyTracker.resetTimer()">↺ 重置</button>
                    <button class="save-btn tracker-save-btn" id="timerSaveBtn" onclick="DailyTracker.submitTimerLog()">保存记录</button>
                </div>
            </div>
        `;
    },

    startTimer() {
        if (this.timerRunning) return;
        this.timerRunning = true;
        this.timerInterval = setInterval(() => {
            this.timerSeconds++;
            // Update display only
            const mins = Math.floor(this.timerSeconds / 60);
            const secs = this.timerSeconds % 60;
            const display = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
            const displayEl = document.querySelector('.timer-display');
            if (displayEl) displayEl.textContent = display;
        }, 1000);
        this.renderTimer(); // re-render to show pause button
    },

    pauseTimer() {
        this.timerRunning = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.renderTimer();
    },

    resetTimer() {
        this.stopTimer();
        this.timerSeconds = 0;
        this.renderTimer();
    },

    stopTimer() {
        this.timerRunning = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    async submitTimerLog() {
        this.stopTimer();
        const minutes = Math.round(this.timerSeconds / 60 * 10) / 10; // convert to minutes with 1 decimal
        const btn = document.getElementById('timerSaveBtn');
        if (btn) { btn.disabled = true; btn.classList.add('btn-loading'); }
        try {
            await apiClient.post('/plan/daily-log', {
                planId: this.planId,
                recordDate: new Date().toISOString().split('T')[0],
                isCompleted: true,
                actualValue: minutes,
                targetValue: minutes,
                notes: '计时器记录: ' + minutes + '分钟'
            });
            Toast.show('记录已保存');
        } catch (e) {
            Toast.show('保存失败: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.classList.remove('btn-loading'); }
        }
    },

    renderCounter() {
        const container = this.getContainer();
        if (!container) return;
        container.classList.add('counter-mode');
        container.innerHTML = `
            <div class="counter-mode">
                <div class="counter-display">
                    <span class="counter-value" id="counterValue">${this.counterValue}</span>
                    <span class="counter-separator">/</span>
                    <span class="counter-target">${this.counterTarget}</span>
                </div>
                <div class="counter-controls">
                    <button class="counter-btn" onclick="DailyTracker.decrement()">−</button>
                    <button class="counter-btn" onclick="DailyTracker.increment()">+</button>
                </div>
                <button class="save-btn tracker-save-btn" id="counterSaveBtn" onclick="DailyTracker.submitCounterLog()">保存记录</button>
            </div>
        `;
    },

    increment() {
        this.counterValue++;
        const valueEl = document.getElementById('counterValue');
        if (valueEl) valueEl.textContent = this.counterValue;
    },

    decrement() {
        if (this.counterValue > 0) {
            this.counterValue--;
            const valueEl = document.getElementById('counterValue');
            if (valueEl) valueEl.textContent = this.counterValue;
        }
    },

    async submitCounterLog() {
        const btn = document.getElementById('counterSaveBtn');
        if (btn) { btn.disabled = true; btn.classList.add('btn-loading'); }
        try {
            await apiClient.post('/plan/daily-log', {
                planId: this.planId,
                recordDate: new Date().toISOString().split('T')[0],
                isCompleted: this.counterValue >= this.counterTarget,
                actualValue: this.counterValue,
                targetValue: this.counterTarget,
                notes: '计数记录: ' + this.counterValue + '/' + this.counterTarget
            });
            Toast.show('记录已保存');
        } catch (e) {
            Toast.show('保存失败: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.classList.remove('btn-loading'); }
        }
    },

    async toggleCheck() {
        const circle = document.querySelector('.check-circle');
        if (!circle) return;
        circle.classList.toggle('checked');
        await this.submitLog(circle.classList.contains('checked'));
    },

    async submitLog(isCompleted) {
        const notesEl = document.getElementById('dailyNotes') || document.getElementById('plan-notes');
        const notes = notesEl ? notesEl.value : '';
        const btn = document.querySelector('.detail-save-btn');
        if (btn) { btn.disabled = true; btn.classList.add('btn-loading'); }
        try {
            await apiClient.post('/plan/daily-log', {
                planId: this.planId,
                recordDate: new Date().toISOString().split('T')[0],
                isCompleted: isCompleted,
                actualValue: isCompleted ? 1 : 0,
                targetValue: 1,
                notes: notes
            });
            Toast.show(isCompleted ? '打卡成功！' : '记录已保存');
        } catch (e) {
            Toast.show('保存失败: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.classList.remove('btn-loading'); }
        }
    },

    getContainer() {
        return document.getElementById('trackerContainer') || document.getElementById('tracker-container');
    }
};
