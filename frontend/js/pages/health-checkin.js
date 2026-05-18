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
    rangeDays: 30,

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

                <section class="record-trends-card">
                    <div class="section-heading">
                        <h2>历史趋势</h2>
                        <span>身体记录</span>
                    </div>
                    <div class="record-range-row">
                        <label>
                            <span>开始日期</span>
                            <input id="record-start-date" type="date">
                        </label>
                        <label>
                            <span>结束日期</span>
                            <input id="record-end-date" type="date">
                        </label>
                        <button class="workspace-link-btn" id="record-range-apply" type="button">查看</button>
                    </div>
                    <div class="workspace-grid two-col record-chart-grid">
                        <div class="chart-panel compact-chart" id="record-weight-chart"></div>
                        <div class="chart-panel compact-chart" id="record-sleep-chart"></div>
                    </div>
                    <div class="chart-panel compact-chart" id="record-calorie-chart"></div>
                </section>

                <section class="record-history-card">
                    <div class="section-heading">
                        <h2>历史记录</h2>
                        <span id="record-history-count">加载中</span>
                    </div>
                    <div id="record-history-list" class="record-history-list">
                        <div class="panel-loading">加载中...</div>
                    </div>
                </section>
            </div>
        `;

        this.bindMetricControls();
        this.bindJournal();
        document.getElementById('btn-submit-record')?.addEventListener('click', () => this.submit());
        document.getElementById('btn-reset-record')?.addEventListener('click', () => this.resetTodayRecord());
        this.bindRangeControls();
        await this.loadTodayRecord();
        await this.loadHistoryAndStats();
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
                currentWeight: this.values.weight,
                caloriesIntake: this.values.caloriesIn,
                caloriesBurned: this.values.caloriesOut,
                sleepHours: this.values.sleepHours,
                diaryText: document.getElementById('diary-text')?.value || ''
            });
            Toast.show('今日日志已提交');
            this.isSubmitted = true;
            this.applySubmittedState();
            await this.loadHistoryAndStats();
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
            await this.loadHistoryAndStats();
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

    bindRangeControls() {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - (this.rangeDays - 1));
        const startInput = document.getElementById('record-start-date');
        const endInput = document.getElementById('record-end-date');
        if (startInput && !startInput.value) startInput.value = this.formatLocalDate(start);
        if (endInput && !endInput.value) endInput.value = this.formatLocalDate(end);
        document.getElementById('record-range-apply')?.addEventListener('click', () => this.loadHistoryAndStats());
    },

    async loadHistoryAndStats() {
        const list = document.getElementById('record-history-list');
        const count = document.getElementById('record-history-count');
        const startDate = document.getElementById('record-start-date')?.value || '';
        const endDate = document.getElementById('record-end-date')?.value || '';
        if (startDate && endDate && startDate > endDate) {
            Toast.show('开始日期不能晚于结束日期');
            return;
        }
        if (list) list.innerHTML = '<div class="panel-loading">加载中...</div>';
        if (count) count.textContent = '加载中';

        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        params.set('limit', '90');

        try {
            const [historyResult, statsResult] = await Promise.all([
                apiClient.get('/record/history?' + params.toString()),
                apiClient.get('/record/stats?' + params.toString())
            ]);
            const history = Array.isArray(historyResult.data) ? historyResult.data : [];
            const stats = statsResult.data || {};
            this.renderHistory(history);
            this.renderStatsCharts(stats);
        } catch (e) {
            if (list) {
                list.innerHTML = `<div class="empty-state"><div class="empty-title">历史记录加载失败</div><div class="empty-desc">${this.escapeHtml(e.message)}</div></div>`;
            }
            if (count) count.textContent = '失败';
            ChartKit.renderLine('record-weight-chart', [], [], { emptyText: '体重趋势加载失败' });
            ChartKit.renderLine('record-sleep-chart', [], [], { emptyText: '睡眠趋势加载失败' });
            ChartKit.renderBars('record-calorie-chart', [], [], { emptyText: '热量趋势加载失败' });
        }
    },

    renderStatsCharts(stats) {
        ChartKit.renderLine('record-weight-chart', stats.dates || [], stats.weights || [], {
            label: '体重趋势',
            color: '#2ea7df',
            colorTo: '#7c8bff',
            emptyText: '还没有体重记录'
        });
        ChartKit.renderLine('record-sleep-chart', stats.dates || [], stats.sleepHours || [], {
            label: '睡眠趋势',
            color: '#9b25e8',
            colorTo: '#2ea7df',
            emptyText: '还没有睡眠记录'
        });
        ChartKit.renderBars('record-calorie-chart', stats.dates || [], stats.caloriesIn || [], {
            label: '摄入卡路里',
            emptyText: '还没有热量记录'
        });
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
            <article class="record-history-item">
                <div>
                    <strong>${this.formatDisplayDate(item.recordDate)}</strong>
                    <span>${this.escapeHtml(item.diaryText || '没有小记')}</span>
                </div>
                <div class="record-history-metrics">
                    <span>${item.currentWeight ?? '--'}kg</span>
                    <span>${item.sleepHours ?? '--'}h</span>
                    <span>摄入 ${item.caloriesIntake ?? '--'}</span>
                    <span>消耗 ${item.caloriesBurned ?? '--'}</span>
                </div>
            </article>
        `).join('');
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
            caloriesIn: '#ff7a3d',
            caloriesOut: '#e9340b',
            sleepHours: '#9b25e8'
        };
        return colors[key] || '#ff7a3d';
    }
};
