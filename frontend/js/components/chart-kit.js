const ChartKit = {
    renderLine(containerId, labels = [], values = [], options = {}) {
        const el = document.getElementById(containerId);
        if (!el) return;
        const safeValues = values.map(value => Number(value) || 0);
        if (!labels.length || !safeValues.length) {
            el.innerHTML = this.empty(options.emptyText || '暂无趋势数据');
            return;
        }

        const width = 640;
        const height = 220;
        const pad = 28;
        const max = Math.max(...safeValues, 1);
        const min = Math.min(...safeValues, 0);
        const span = Math.max(max - min, 1);
        const points = safeValues.map((value, index) => {
            const x = pad + (index / Math.max(safeValues.length - 1, 1)) * (width - pad * 2);
            const y = height - pad - ((value - min) / span) * (height - pad * 2);
            return [x, y];
        });
        const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(' ');

        el.innerHTML = `
            <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${this.escape(options.label || '趋势图')}">
                <defs>
                    <linearGradient id="${containerId}-line" x1="0" x2="1">
                        <stop offset="0%" stop-color="${options.color || '#ff7a3d'}" />
                        <stop offset="100%" stop-color="${options.colorTo || '#e9340b'}" />
                    </linearGradient>
                </defs>
                ${[0, 1, 2, 3].map(i => `<line x1="${pad}" x2="${width - pad}" y1="${pad + i * ((height - pad * 2) / 3)}" y2="${pad + i * ((height - pad * 2) / 3)}" />`).join('')}
                <path d="${path}" fill="none" stroke="url(#${containerId}-line)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
                ${points.map((point, index) => `<circle cx="${point[0].toFixed(1)}" cy="${point[1].toFixed(1)}" r="${index === points.length - 1 ? 6 : 4}" />`).join('')}
            </svg>
        `;
    },

    renderBars(containerId, labels = [], values = [], options = {}) {
        const el = document.getElementById(containerId);
        if (!el) return;
        const safeValues = values.map(value => Number(value) || 0);
        if (!labels.length || !safeValues.length) {
            el.innerHTML = this.empty(options.emptyText || '暂无柱状数据');
            return;
        }
        const max = Math.max(...safeValues, 1);
        el.innerHTML = `
            <div class="bar-chart" role="img" aria-label="${this.escape(options.label || '柱状图')}">
                ${safeValues.map((value, index) => `
                    <div class="bar-chart-item">
                        <span class="bar-chart-bar" style="height:${Math.max(8, Math.round(value / max * 100))}%"></span>
                        <small>${this.escape(this.shortLabel(labels[index]))}</small>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderDonut(containerId, items = []) {
        const el = document.getElementById(containerId);
        if (!el) return;
        const total = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
        if (!total) {
            el.innerHTML = this.empty('暂无比例数据');
            return;
        }
        let acc = 0;
        const stops = items.map(item => {
            const value = Number(item.value) || 0;
            const start = acc / total * 100;
            acc += value;
            const end = acc / total * 100;
            return `${item.color || '#ff7a3d'} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
        }).join(', ');
        el.innerHTML = `
            <div class="donut-chart" style="background:conic-gradient(${stops})">
                <strong>${total}</strong>
                <span>总计</span>
            </div>
            <div class="donut-legend">
                ${items.map(item => `<span><i style="background:${item.color || '#ff7a3d'}"></i>${this.escape(item.label)} ${item.value || 0}</span>`).join('')}
            </div>
        `;
    },

    empty(text) {
        return `<div class="chart-empty">${this.escape(text)}</div>`;
    },

    shortLabel(label) {
        const text = String(label || '');
        return text.length > 5 ? text.slice(5) : text;
    },

    escape(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
};
