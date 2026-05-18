// 记录页面：身体记录 + 今日小记
const HealthCheckinPage = {
    metrics: [
        {
            key: 'weight',
            title: '体重',
            icon: '⚖️',
            unit: 'kg',
            min: 30,
            max: 200,
            step: 0.1,
            decimals: 1,
            defaultValue: 70.0,
            requestKey: 'currentWeight'
        },
        {
            key: 'caloriesIn',
            title: '摄入卡路里',
            icon: '🍽️',
            unit: 'kcal',
            min: 0,
            max: 5000,
            step: 1,
            decimals: 0,
            defaultValue: 2000,
            requestKey: 'caloriesIntake'
        },
        {
            key: 'caloriesOut',
            title: '消耗卡路里',
            icon: '🔥',
            unit: 'kcal',
            min: 0,
            max: 5000,
            step: 1,
            decimals: 0,
            defaultValue: 500,
            requestKey: 'caloriesBurned'
        },
        {
            key: 'sleepHours',
            title: '睡眠时长',
            icon: '🌙',
            unit: 'h',
            min: 0,
            max: 12,
            step: 0.1,
            decimals: 1,
            defaultValue: 7.5,
            requestKey: 'sleepHours'
        },
        {
            key: 'steps',
            title: '步数',
            icon: '👟',
            unit: '步',
            min: 0,
            max: 40000,
            step: 100,
            decimals: 0,
            defaultValue: null,
            requestKey: 'steps',
            required: true
        },
        {
            key: 'exerciseMinutes',
            title: '锻炼时长',
            icon: '🏋️',
            unit: 'min',
            min: 0,
            max: 300,
            step: 5,
            decimals: 0,
            defaultValue: 0,
            requestKey: 'exerciseMinutes'
        }
    ],
    stateGroups: [
        {
            key: 'moodLevel',
            title: '心情',
            icon: '🙂',
            required: true,
            accent: '#d88ca8',
            options: [
                { value: 1, emoji: '😣', label: '低落' },
                { value: 2, emoji: '😐', label: '平淡' },
                { value: 3, emoji: '🙂', label: '平稳' },
                { value: 4, emoji: '😄', label: '愉快' },
                { value: 5, emoji: '✨', label: '很好' }
            ]
        },
        {
            key: 'energyLevel',
            title: '精力',
            icon: '⚡',
            required: true,
            accent: '#e0a447',
            options: [
                { value: 1, emoji: '🪫', label: '很低' },
                { value: 2, emoji: '🔋', label: '偏低' },
                { value: 3, emoji: '🙂', label: '够用' },
                { value: 4, emoji: '⚡', label: '充足' },
                { value: 5, emoji: '🚀', label: '高能' }
            ]
        },
        {
            key: 'stressLevel',
            title: '压力',
            icon: '🧘',
            required: true,
            accent: '#87a8be',
            options: [
                { value: 1, emoji: '🧘', label: '很低' },
                { value: 2, emoji: '🌤️', label: '较低' },
                { value: 3, emoji: '😐', label: '可控' },
                { value: 4, emoji: '😣', label: '偏高' },
                { value: 5, emoji: '🔥', label: '很高' }
            ]
        }
    ],
    values: {},
    diaryLimit: 1000,
    isSubmitted: false,
    isSubmitting: false,
    rangeDays: 30,
    selectedDate: null,

    async render() {
        document.getElementById('top-nav').classList.remove('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');
        document.getElementById('fab-add-habit').classList.add('hidden');

        this.resetLocalValues();
        this.isSubmitted = false;
        this.isSubmitting = false;
        this.selectedDate = this.getTodayDate();
        document.getElementById('page-container').innerHTML = `
            <div class="record-page">
                <section class="record-header">
                    <div>
                        <p class="page-kicker">今日记录</p>
                        <h1>记录今天</h1>
                        <p>记录今天的身体状态和一点真实想法，帮助你看见长期变化。</p>
                    </div>
                </section>

                <section class="record-metrics-grid" aria-label="身体记录">
                    ${this.metrics.map(metric => this.renderMetricCard(metric)).join('')}
                </section>

                <section class="record-state-card" aria-label="状态记录">
                    <div class="section-heading">
                        <h2>今日状态</h2>
                        <span>必填</span>
                    </div>
                    <div class="record-state-grid">
                        ${this.stateGroups.map(group => this.renderStateGroup(group)).join('')}
                    </div>
                </section>

                <section class="journal-card">
                    <div class="journal-heading">
                        <div>
                            <h2>今日小记</h2>
                            <p>写下今天发生了什么、状态如何，或者有什么值得复盘。</p>
                        </div>
                        <span id="diary-count">0/${this.diaryLimit}</span>
                    </div>
                    <textarea
                        id="diary-text"
                        class="journal-textarea"
                        maxlength="${this.diaryLimit}"
                        rows="5"
                        placeholder="今天最值得记录的一件事是……"></textarea>
                </section>

                <section class="record-submitted-card hidden" id="record-submitted-card" aria-live="polite">
                    <strong>今日记录已保存</strong>
                    <span>可以继续调整后再次保存，同一天记录会更新，不会重复创建。</span>
                </section>

                <div class="record-form-error hidden" id="record-form-error" role="alert"></div>

                <div class="record-actions">
                    <button class="btn btn-primary record-submit-btn" id="btn-submit-record" type="button">提交今日记录</button>
                    <button class="record-reset-btn hidden" id="btn-reset-record" type="button">重置</button>
                </div>

                <section class="record-history-card">
                    <div class="section-heading">
                        <h2>历史记录</h2>
                        <span id="record-history-count">加载中</span>
                    </div>
                    <div class="record-date-inspector">
                        <label>
                            <span>查看日期</span>
                            <input id="record-selected-date" type="date" value="${this.selectedDate}">
                        </label>
                        <button class="workspace-link-btn" id="record-date-apply" type="button">查看当日记录</button>
                    </div>
                    <div id="record-selected-detail" class="record-selected-detail">
                        <div class="panel-loading">加载中...</div>
                    </div>
                    <div id="record-history-list" class="record-history-list">
                        <div class="panel-loading">加载中...</div>
                    </div>
                </section>
            </div>
        `;

        this.bindMetricControls();
        this.bindStateControls();
        this.bindJournal();
        document.getElementById('btn-submit-record')?.addEventListener('click', () => this.submit());
        document.getElementById('btn-reset-record')?.addEventListener('click', () => this.resetTodayRecord());
        this.bindRangeControls();
        await this.loadTodayRecord();
        await this.loadHistoryAndSelected();
    },

    renderMetricCard(metric) {
        const rawValue = this.values[metric.key];
        const sliderValue = rawValue !== null && rawValue !== undefined ? rawValue : metric.min;
        return `
            <article class="record-metric-card" style="--metric-accent: ${this.getMetricAccent(metric.key)}">
                <div class="metric-card-head">
                    <span class="metric-icon">${metric.icon}</span>
                    <span class="metric-title">${metric.title}${metric.required ? '<em>必填</em>' : ''}</span>
                </div>
                <div class="metric-main-value">
                    <strong id="${metric.key}-value">${this.formatValue(metric, rawValue)}</strong>
                    <span>${metric.unit}</span>
                </div>
                <input
                    type="range"
                    id="${metric.key}"
                    class="metric-slider"
                    min="${metric.min}"
                    max="${metric.max}"
                    step="${metric.step}"
                    value="${sliderValue}"
                    data-metric="${metric.key}">
                <div class="metric-controls">
                    <button class="metric-stepper-btn" type="button" data-metric="${metric.key}" data-delta="-${metric.step}" aria-label="${metric.title}减少">−</button>
                    <span>${metric.min}${metric.unit} - ${metric.max}${metric.unit}</span>
                    <button class="metric-stepper-btn" type="button" data-metric="${metric.key}" data-delta="${metric.step}" aria-label="${metric.title}增加">+</button>
                </div>
            </article>
        `;
    },

    renderStateGroup(group) {
        return `
            <article class="record-state-group" style="--state-accent: ${group.accent}">
                <div class="metric-card-head">
                    <span class="metric-icon">${group.icon}</span>
                    <span class="metric-title">${group.title}<em>必填</em></span>
                </div>
                <div class="state-option-grid">
                    ${group.options.map(option => `
                        <button class="state-option${this.values[group.key] === option.value ? ' selected' : ''}" type="button" data-state-key="${group.key}" data-state-value="${option.value}">
                            <span class="state-emoji-tile">${option.emoji}</span>
                            <strong>${option.label}</strong>
                        </button>
                    `).join('')}
                </div>
            </article>
        `;
    },

    bindMetricControls() {
        this.metrics.forEach(metric => {
            const slider = document.getElementById(metric.key);
            if (!slider) return;
            slider.addEventListener('input', () => {
                this.setMetricValue(metric.key, parseFloat(slider.value));
                this.clearFormError();
            });
            this.setMetricValue(metric.key, this.values[metric.key], { preserveEmpty: true });
        });

        document.querySelectorAll('.metric-stepper-btn').forEach(button => {
            button.addEventListener('click', () => {
                const key = button.dataset.metric;
                const delta = parseFloat(button.dataset.delta || '0');
                this.setMetricValue(key, (this.values[key] || 0) + delta);
            });
        });
    },

    bindStateControls() {
        document.querySelectorAll('.state-option').forEach(button => {
            button.addEventListener('click', () => {
                const key = button.dataset.stateKey;
                const value = Number(button.dataset.stateValue);
                this.values[key] = value;
                document.querySelectorAll(`.state-option[data-state-key="${key}"]`).forEach(item => {
                    item.classList.toggle('selected', item === button);
                });
                this.clearFormError();
            });
        });
    },

    bindJournal() {
        const textarea = document.getElementById('diary-text');
        if (!textarea) return;
        textarea.addEventListener('input', () => this.updateDiaryCount());
        this.updateDiaryCount();
    },

    async loadTodayRecord() {
        try {
            const result = await apiClient.get('/record/today');
            const record = result.data || {};
            this.metrics.forEach(metric => {
                const value = record[metric.requestKey];
                this.setMetricValue(metric.key, value !== null && value !== undefined ? Number(value) : metric.defaultValue, { preserveEmpty: true });
            });
            this.stateGroups.forEach(group => {
                this.values[group.key] = record[group.key] ?? null;
            });
            this.refreshStateSelections();
            const diaryEl = document.getElementById('diary-text');
            if (diaryEl) {
                diaryEl.value = record.diaryText || '';
                this.updateDiaryCount();
            }
            this.isSubmitted = Boolean(record.healthRecordExists || record.journalExists);
            this.applySubmittedState();
        } catch (e) {
            Toast.show('今日记录加载失败: ' + e.message);
            this.applySubmittedState();
        }
    },

    async submit() {
        if (this.isSubmitting) return;
        const errors = this.validateRequiredFields();
        if (errors.length) {
            this.showFormError(errors.join('、'));
            Toast.show(errors[0]);
            return;
        }
        this.isSubmitting = true;
        const btn = document.getElementById('btn-submit-record');
        if (btn) {
            btn.disabled = true;
            btn.classList.add('btn-loading');
        }

        try {
            await apiClient.post('/record/today', {
                currentWeight: this.values.weight,
                caloriesIntake: this.values.caloriesIn,
                caloriesBurned: this.values.caloriesOut,
                sleepHours: this.values.sleepHours,
                steps: this.values.steps,
                exerciseMinutes: this.values.exerciseMinutes,
                moodLevel: this.values.moodLevel,
                energyLevel: this.values.energyLevel,
                stressLevel: this.values.stressLevel,
                diaryText: document.getElementById('diary-text')?.value || ''
            });
            Toast.show(this.isSubmitted ? '今日记录已更新' : '今日记录已保存');
            this.isSubmitted = true;
            this.applySubmittedState();
            this.selectedDate = this.getTodayDate();
            const selectedInput = document.getElementById('record-selected-date');
            if (selectedInput) selectedInput.value = this.selectedDate;
            await this.loadHistoryAndSelected();
        } catch (e) {
            Toast.show('保存失败: ' + e.message);
        } finally {
            this.isSubmitting = false;
            if (btn) {
                btn.classList.remove('btn-loading');
            }
            this.applySubmittedState();
        }
    },

    async resetTodayRecord() {
        if (!this.isSubmitted) return;
        if (!confirm('确定重置今日记录吗？这不会影响今日计划打卡。')) return;

        this.isSubmitting = true;
        const btn = document.getElementById('btn-reset-record');
        if (btn) btn.disabled = true;

        try {
            await apiClient.delete('/record/today');
            this.resetLocalValues();
            this.metrics.forEach(metric => this.setMetricValue(metric.key, metric.defaultValue));
            this.refreshStateSelections();
            const diaryEl = document.getElementById('diary-text');
            if (diaryEl) diaryEl.value = '';
            this.updateDiaryCount();
            this.isSubmitted = false;
            this.applySubmittedState();
            await this.loadHistoryAndSelected();
            Toast.show('今日记录已重置');
        } catch (e) {
            Toast.show('重置失败: ' + e.message);
        } finally {
            this.isSubmitting = false;
            this.applySubmittedState();
        }
    },

    applySubmittedState() {
        const page = document.querySelector('.record-page');
        const submittedCard = document.getElementById('record-submitted-card');
        const submitBtn = document.getElementById('btn-submit-record');
        const resetBtn = document.getElementById('btn-reset-record');
        const diaryEl = document.getElementById('diary-text');

        page?.classList.toggle('record-submitted', this.isSubmitted);
        submittedCard?.classList.toggle('hidden', !this.isSubmitted);

        if (submitBtn) {
            submitBtn.classList.remove('hidden');
            submitBtn.disabled = this.isSubmitting;
            submitBtn.textContent = this.isSubmitting ? '保存中...' : (this.isSubmitted ? '更新今日记录' : '提交今日记录');
        }
        if (resetBtn) {
            resetBtn.classList.toggle('hidden', !this.isSubmitted);
            resetBtn.disabled = this.isSubmitting;
        }

        if (diaryEl) diaryEl.readOnly = false;
        document.querySelectorAll('.metric-slider, .metric-stepper-btn, .state-option').forEach(el => {
            el.disabled = this.isSubmitting;
        });
    },

    resetLocalValues() {
        this.values = {};
        this.metrics.forEach(metric => {
            this.values[metric.key] = metric.defaultValue;
        });
        this.stateGroups.forEach(group => {
            this.values[group.key] = null;
        });
    },

    setMetricValue(key, rawValue, options = {}) {
        const metric = this.metrics.find(item => item.key === key);
        if (!metric) return;
        const normalized = this.normalizeValue(metric, rawValue);
        this.values[key] = normalized;

        const slider = document.getElementById(key);
        if (slider) slider.value = normalized ?? metric.min;
        const valueEl = document.getElementById(`${key}-value`);
        if (valueEl) valueEl.textContent = this.formatValue(metric, normalized);
    },

    normalizeValue(metric, rawValue) {
        if (rawValue === null || rawValue === undefined || rawValue === '') {
            return metric.defaultValue ?? null;
        }
        const numeric = Number.isFinite(Number(rawValue)) ? Number(rawValue) : metric.defaultValue;
        if (numeric === null || numeric === undefined) {
            return null;
        }
        const clamped = Math.min(metric.max, Math.max(metric.min, numeric));
        if (metric.decimals === 0) {
            return Math.round(clamped);
        }
        return Number(clamped.toFixed(metric.decimals));
    },

    formatValue(metric, value) {
        if (value === null || value === undefined || value === '') return '--';
        if (metric.decimals === 0) return String(Math.round(value));
        return Number(value).toFixed(metric.decimals);
    },

    refreshStateSelections() {
        this.stateGroups.forEach(group => {
            document.querySelectorAll(`.state-option[data-state-key="${group.key}"]`).forEach(button => {
                button.classList.toggle('selected', Number(button.dataset.stateValue) === Number(this.values[group.key]));
            });
        });
    },

    validateRequiredFields() {
        const errors = [];
        const steps = this.values.steps;
        if (steps === null || steps === undefined || !Number.isFinite(Number(steps))) {
            errors.push('请填写步数');
        }
        const exercise = this.values.exerciseMinutes;
        if (exercise === null || exercise === undefined || !Number.isFinite(Number(exercise))) {
            errors.push('请选择锻炼时长');
        }
        this.stateGroups.forEach(group => {
            if (group.required && !this.values[group.key]) {
                errors.push(`请选择${group.title}`);
            }
        });
        return errors;
    },

    showFormError(message) {
        const el = document.getElementById('record-form-error');
        if (!el) return;
        el.textContent = message;
        el.classList.remove('hidden');
    },

    clearFormError() {
        const el = document.getElementById('record-form-error');
        if (!el) return;
        el.textContent = '';
        el.classList.add('hidden');
    },

    updateDiaryCount() {
        const textarea = document.getElementById('diary-text');
        const count = document.getElementById('diary-count');
        if (!textarea || !count) return;
        count.textContent = `${textarea.value.length}/${this.diaryLimit}`;
    },

    getTodayDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    bindRangeControls() {
        const selectedInput = document.getElementById('record-selected-date');
        if (selectedInput && !selectedInput.value) selectedInput.value = this.selectedDate || this.getTodayDate();
        document.getElementById('record-date-apply')?.addEventListener('click', () => {
            this.selectedDate = selectedInput?.value || this.getTodayDate();
            this.loadSelectedRecord();
        });
        selectedInput?.addEventListener('change', () => {
            this.selectedDate = selectedInput.value || this.getTodayDate();
            this.loadSelectedRecord();
        });
    },

    async loadHistoryAndSelected() {
        const list = document.getElementById('record-history-list');
        const count = document.getElementById('record-history-count');
        if (list) list.innerHTML = '<div class="panel-loading">加载中...</div>';
        if (count) count.textContent = '加载中';

        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - (this.rangeDays - 1));
        const params = new URLSearchParams();
        params.set('startDate', this.formatLocalDate(start));
        params.set('endDate', this.formatLocalDate(end));
        params.set('limit', '90');

        try {
            const historyResult = await apiClient.get('/record/history?' + params.toString());
            const history = Array.isArray(historyResult.data) ? historyResult.data : [];
            this.renderHistory(history);
            await this.loadSelectedRecord();
        } catch (e) {
            if (list) {
                list.innerHTML = `<div class="empty-state"><div class="empty-title">历史记录加载失败</div><div class="empty-desc">${this.escapeHtml(e.message)}</div></div>`;
            }
            if (count) count.textContent = '失败';
            const detail = document.getElementById('record-selected-detail');
            if (detail) detail.innerHTML = `<div class="workspace-empty-mini"><strong>当日记录加载失败</strong><span>${this.escapeHtml(e.message)}</span></div>`;
        }
    },

    async loadSelectedRecord() {
        const detail = document.getElementById('record-selected-detail');
        const selectedInput = document.getElementById('record-selected-date');
        const date = selectedInput?.value || this.selectedDate || this.getTodayDate();
        this.selectedDate = date;
        if (detail) detail.innerHTML = '<div class="panel-loading">加载中...</div>';
        try {
            const result = await apiClient.get('/record?recordDate=' + encodeURIComponent(date));
            this.renderSelectedRecord(result.data || {});
        } catch (e) {
            if (detail) {
                detail.innerHTML = `<div class="workspace-empty-mini"><strong>当日记录加载失败</strong><span>${this.escapeHtml(e.message)}</span></div>`;
            }
        }
    },

    renderSelectedRecord(record) {
        const detail = document.getElementById('record-selected-detail');
        if (!detail) return;
        const exists = Boolean(record.healthRecordExists || record.journalExists);
        if (!exists) {
            detail.innerHTML = `
                <div class="workspace-empty-mini">
                    <strong>${this.escapeHtml(this.formatDisplayDate(record.recordDate || this.selectedDate))} 没有记录</strong>
                    <span>选择其他日期，或回到今天填写一条新的状态记录。</span>
                </div>
            `;
            return;
        }
        detail.innerHTML = `
            <article class="record-detail-card">
                <div class="record-detail-head">
                    <strong>${this.escapeHtml(this.formatDisplayDate(record.recordDate || this.selectedDate))}</strong>
                    <span>${record.healthRecordExists ? '身体记录已记录' : '仅有小记'}</span>
                </div>
                <div class="record-detail-grid">
                    ${this.renderDetailMetric('体重', record.currentWeight ?? '--', 'kg')}
                    ${this.renderDetailMetric('摄入', record.caloriesIntake ?? '--', 'kcal')}
                    ${this.renderDetailMetric('消耗', record.caloriesBurned ?? '--', 'kcal')}
                    ${this.renderDetailMetric('睡眠', record.sleepHours ?? '--', 'h')}
                    ${this.renderDetailMetric('步数', record.steps ?? '--', '步')}
                    ${this.renderDetailMetric('锻炼', record.exerciseMinutes ?? '--', 'min')}
                    ${this.renderDetailMetric('心情', this.formatStateLabel('moodLevel', record.moodLevel), '')}
                    ${this.renderDetailMetric('精力', this.formatStateLabel('energyLevel', record.energyLevel), '')}
                    ${this.renderDetailMetric('压力', this.formatStateLabel('stressLevel', record.stressLevel), '')}
                </div>
                <p class="record-detail-note">${this.escapeHtml(record.diaryText || '没有小记')}</p>
            </article>
        `;
    },

    renderDetailMetric(label, value, unit) {
        return `
            <div class="record-detail-metric">
                <span>${this.escapeHtml(label)}</span>
                <strong>${this.escapeHtml(String(value))}<small>${this.escapeHtml(unit)}</small></strong>
            </div>
        `;
    },

    renderHistory(history) {
        const list = document.getElementById('record-history-list');
        const count = document.getElementById('record-history-count');
        if (count) count.textContent = history.length ? `${history.length} 条` : '暂无';
        if (!list) return;
        if (!history.length) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-title">还没有历史记录</div>
                    <div class="empty-desc">提交今日记录后，这里会保留身体状态和小记。</div>
                </div>
            `;
            return;
        }
        list.innerHTML = history.map(item => `
            <button class="record-history-item" type="button" onclick="HealthCheckinPage.selectHistoryDate('${this.escapeAttr(this.formatDisplayDate(item.recordDate))}')">
                <div>
                    <strong>${this.formatDisplayDate(item.recordDate)}</strong>
                    <span>${this.escapeHtml(item.diaryText || '没有小记')}</span>
                </div>
                <div class="record-history-metrics">
                    <span>${item.steps ?? '--'} 步</span>
                    <span>锻炼 ${item.exerciseMinutes ?? '--'}min</span>
                    <span>心情 ${this.formatStateLabel('moodLevel', item.moodLevel)}</span>
                    <span>精力 ${this.formatStateLabel('energyLevel', item.energyLevel)}</span>
                    <span>压力 ${this.formatStateLabel('stressLevel', item.stressLevel)}</span>
                    <span>${item.currentWeight ?? '--'}kg</span>
                    <span>${item.sleepHours ?? '--'}h</span>
                    <span>摄入 ${item.caloriesIntake ?? '--'}</span>
                    <span>消耗 ${item.caloriesBurned ?? '--'}</span>
                </div>
            </button>
        `).join('');
    },

    selectHistoryDate(date) {
        if (!date || date === '--') return;
        this.selectedDate = date;
        const selectedInput = document.getElementById('record-selected-date');
        if (selectedInput) selectedInput.value = date;
        this.loadSelectedRecord();
    },

    formatDisplayDate(dateValue) {
        if (Array.isArray(dateValue)) {
            const [year, month, day] = dateValue;
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        return this.escapeHtml(String(dateValue || '--'));
    },

    formatLocalDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    getMetricAccent(key) {
        const colors = {
            weight: '#2ea7df',
            steps: '#ff7a3d',
            exerciseMinutes: '#37c978',
            caloriesIn: '#ff7a3d',
            caloriesOut: '#e9340b',
            sleepHours: '#9b25e8'
        };
        return colors[key] || '#ff7a3d';
    },

    formatStateLabel(key, value) {
        const group = this.stateGroups.find(item => item.key === key);
        const option = group?.options.find(item => Number(item.value) === Number(value));
        return option ? option.label : '--';
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
