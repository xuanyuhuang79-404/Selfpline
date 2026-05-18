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
        }
    ],
    values: {},
    diaryLimit: 1000,
    isSubmitted: false,
    isSubmitting: false,

    async render() {
        document.getElementById('top-nav').classList.remove('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');
        document.getElementById('fab-add-habit').classList.add('hidden');

        this.resetLocalValues();
        this.isSubmitted = false;
        this.isSubmitting = false;
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
                    <strong>今日日志已提交</strong>
                    <span>如需修改今天的身体记录或小记，请先重置后重新填写。</span>
                </section>

                <div class="record-actions">
                    <button class="btn btn-primary record-submit-btn" id="btn-submit-record" type="button">提交今日记录</button>
                    <button class="record-reset-btn hidden" id="btn-reset-record" type="button">重置</button>
                </div>
            </div>
        `;

        this.bindMetricControls();
        this.bindJournal();
        document.getElementById('btn-submit-record')?.addEventListener('click', () => this.submit());
        document.getElementById('btn-reset-record')?.addEventListener('click', () => this.resetTodayRecord());
        await this.loadTodayRecord();
    },

    renderMetricCard(metric) {
        return `
            <article class="record-metric-card" style="--metric-accent: ${this.getMetricAccent(metric.key)}">
                <div class="metric-card-head">
                    <span class="metric-icon">${metric.icon}</span>
                    <span class="metric-title">${metric.title}</span>
                </div>
                <div class="metric-main-value">
                    <strong id="${metric.key}-value">${this.formatValue(metric, this.values[metric.key])}</strong>
                    <span>${metric.unit}</span>
                </div>
                <input
                    type="range"
                    id="${metric.key}"
                    class="metric-slider"
                    min="${metric.min}"
                    max="${metric.max}"
                    step="${metric.step}"
                    value="${this.values[metric.key]}"
                    data-metric="${metric.key}">
                <div class="metric-controls">
                    <button class="metric-stepper-btn" type="button" data-metric="${metric.key}" data-delta="-${metric.step}" aria-label="${metric.title}减少">−</button>
                    <span>${metric.min}${metric.unit} - ${metric.max}${metric.unit}</span>
                    <button class="metric-stepper-btn" type="button" data-metric="${metric.key}" data-delta="${metric.step}" aria-label="${metric.title}增加">+</button>
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
            });
            this.setMetricValue(metric.key, this.values[metric.key]);
        });

        document.querySelectorAll('.metric-stepper-btn').forEach(button => {
            button.addEventListener('click', () => {
                const key = button.dataset.metric;
                const delta = parseFloat(button.dataset.delta || '0');
                this.setMetricValue(key, (this.values[key] || 0) + delta);
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
                this.setMetricValue(metric.key, value !== null && value !== undefined ? Number(value) : metric.defaultValue);
            });
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
        if (this.isSubmitted || this.isSubmitting) return;
        this.isSubmitting = true;
        const btn = document.getElementById('btn-submit-record');
        if (btn) {
            btn.disabled = true;
            btn.classList.add('btn-loading');
        }

        try {
            await apiClient.post('/record/today', {
                recordDate: this.getTodayDate(),
                currentWeight: this.values.weight,
                caloriesIntake: this.values.caloriesIn,
                caloriesBurned: this.values.caloriesOut,
                sleepHours: this.values.sleepHours,
                diaryText: document.getElementById('diary-text')?.value || ''
            });
            Toast.show('今日日志已提交');
            this.isSubmitted = true;
            this.applySubmittedState();
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
            const diaryEl = document.getElementById('diary-text');
            if (diaryEl) diaryEl.value = '';
            this.updateDiaryCount();
            this.isSubmitted = false;
            this.applySubmittedState();
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
            submitBtn.classList.toggle('hidden', this.isSubmitted);
            submitBtn.disabled = this.isSubmitted || this.isSubmitting;
            submitBtn.textContent = this.isSubmitting ? '提交中...' : '提交今日记录';
        }
        if (resetBtn) {
            resetBtn.classList.toggle('hidden', !this.isSubmitted);
            resetBtn.disabled = this.isSubmitting;
        }

        if (diaryEl) diaryEl.readOnly = this.isSubmitted;
        document.querySelectorAll('.metric-slider, .metric-stepper-btn').forEach(el => {
            el.disabled = this.isSubmitted;
        });
    },

    resetLocalValues() {
        this.values = {};
        this.metrics.forEach(metric => {
            this.values[metric.key] = metric.defaultValue;
        });
    },

    setMetricValue(key, rawValue) {
        const metric = this.metrics.find(item => item.key === key);
        if (!metric) return;
        const normalized = this.normalizeValue(metric, rawValue);
        this.values[key] = normalized;

        const slider = document.getElementById(key);
        if (slider) slider.value = normalized;
        const valueEl = document.getElementById(`${key}-value`);
        if (valueEl) valueEl.textContent = this.formatValue(metric, normalized);
    },

    normalizeValue(metric, rawValue) {
        const numeric = Number.isFinite(Number(rawValue)) ? Number(rawValue) : metric.defaultValue;
        const clamped = Math.min(metric.max, Math.max(metric.min, numeric));
        if (metric.decimals === 0) {
            return Math.round(clamped);
        }
        return Number(clamped.toFixed(metric.decimals));
    },

    formatValue(metric, value) {
        if (metric.decimals === 0) return String(Math.round(value));
        return Number(value).toFixed(metric.decimals);
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

    getMetricAccent(key) {
        const colors = {
            weight: '#2ea7df',
            caloriesIn: '#ff7a3d',
            caloriesOut: '#e9340b',
            sleepHours: '#9b25e8'
        };
        return colors[key] || '#ff7a3d';
    }
};
