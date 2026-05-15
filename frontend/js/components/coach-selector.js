// 教练选择器组件
const CoachSelector = {
    coaches: [],
    selectedCoach: null,

    async load() {
        try {
            const result = await apiClient.get('/ai/coaches');
            this.coaches = Array.isArray(result.data) ? result.data : [];
        } catch (e) {
            Toast.show('AI 教练加载失败，已使用默认教练');
            this.coaches = this.getFallbackCoaches();
        }
        if (this.coaches.length === 0) {
            this.coaches = this.getFallbackCoaches();
        }
        this.selectedCoach = this.coaches[0];
        this.render();
    },

    getFallbackCoaches() {
        return [
            {
                coachKey: 'REHAB_COACH',
                coachName: '温和指导师',
                coachAvatar: '🌿',
                coachDescription: '适合稳步建立习惯'
            }
        ];
    },

    render() {
        const container = document.querySelector('.coach-selector');
        if (!container) return;

        container.innerHTML = this.coaches.map(c => `
            <div class="coach-chip ${c.coachKey === this.selectedCoach?.coachKey ? 'selected' : ''}"
                 onclick="CoachSelector.select('${c.coachKey}')">
                ${this.escapeHtml(c.coachAvatar || '✨')} ${this.escapeHtml(c.coachName || 'AI 指导师')}
            </div>
        `).join('');
    },

    select(coachKey) {
        this.selectedCoach = this.coaches.find(c => c.coachKey === coachKey);
        this.render();
        if (typeof AiClassroom !== 'undefined') {
            AiClassroom.onCoachChanged(this.selectedCoach);
        }
    },

    getSelected() {
        if (!this.selectedCoach) {
            this.selectedCoach = this.getFallbackCoaches()[0];
        }
        return this.selectedCoach;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
};
