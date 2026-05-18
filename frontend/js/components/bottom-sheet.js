// 新建计划目标选择弹窗
const BottomSheet = {
    init() {
        document.querySelector('#bottom-sheet .sheet-close')?.addEventListener('click', () => this.hide());
        document.querySelector('#bottom-sheet .sheet-handle')?.addEventListener('click', () => this.hide());
        document.querySelectorAll('#bottom-sheet .direction-card').forEach(card => {
            card.addEventListener('click', () => this.selectPlanTarget(card));
        });
        document.getElementById('fab-add-habit')?.addEventListener('click', () => this.show());
    },

    selectPlanTarget(card) {
        const direction = card.dataset.direction || 'BUILD';
        const sceneKey = card.dataset.sceneKey || (direction === 'QUIT' ? 'quit_stay_up_late' : 'build_exercise_habit');
        const targetName = card.querySelector('.direction-title')?.textContent?.trim() || '';
        this.hide();
        PageRouter.navigate('create-plan', { direction, sceneKey, targetName });
    },

    show() {
        document.getElementById('bottom-sheet')?.classList.remove('hidden');
    },

    hide() {
        document.getElementById('bottom-sheet')?.classList.add('hidden');
    }
};
