// 主应用入口 — 路由 + 初始化
const PageRouter = {
    currentPage: null,
    params: null,

    navigate(pageName, params) {
        this.params = params || {};
        window.location.hash = pageName;
    },

    route() {
        const hash = window.location.hash.replace('#', '') || 'auth';
        const pageName = hash.split('?')[0];
        this.currentPage = pageName;

        const container = document.getElementById('page-container');
        if (!container) return;
        document.getElementById('app')?.classList.toggle('auth-mode', pageName === 'auth');
        this.updateNavState(pageName);
        this.updateHeader(pageName);

        let renderTask;
        switch (pageName) {
            case 'auth': renderTask = AuthPage.render(); break;
            case 'home': renderTask = HomePage.render(); break;
            case 'ai-coach':
            case 'ai-coach-chat':
                renderTask = AiCoachPage.render(this.getParams());
                break;
            case 'ai-classroom': renderTask = AiClassroom.render(this.getParams()); break;
            case 'plan-detail': renderTask = PlanDetailPage.render(this.getParams()); break;
            case 'health': renderTask = HealthCheckinPage.render(); break;
            case 'community': renderTask = CommunityPage.render(); break;
            case 'profile': renderTask = ProfilePage.render(); break;
            default: renderTask = HomePage.render();
        }
        this.afterRender(pageName);
        if (renderTask && typeof renderTask.catch === 'function') {
            renderTask.catch(error => {
                console.error('Page render failed:', error);
                Toast.show(error?.message || '页面加载失败，请重试');
            });
        }
    },

    getParams() {
        return this.params || {};
    },

    updateNavState(pageName) {
        const activePage = (pageName === 'plan-detail' || pageName === 'ai-classroom' || pageName === 'ai-coach' || pageName === 'ai-coach-chat')
            ? 'home'
            : pageName;
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.page === activePage);
        });
    },

    updateHeader(pageName) {
        const titles = {
            auth: ['Selfpline', '习惯管理 / AI 指导师'],
            home: ['今日工作台', '计划、周历与 AI 建议'],
            'ai-coach': ['AI 指导师', '选择身份风格并开始对话'],
            'ai-coach-chat': ['AI 指导师', '选择身份风格并开始对话'],
            'ai-classroom': ['创建计划', 'Build / Quit 下细化你的执行方案'],
            'plan-detail': ['计划详情', '记录、复盘与调整'],
            health: ['健康打卡', '同步身体状态与执行情况'],
            community: ['运动社区', '分享执行现场'],
            profile: ['个人中心', '档案、统计与通知']
        };
        const [title, subtitle] = titles[pageName] || titles.home;
        const titleEl = document.querySelector('.nav-title');
        const subtitleEl = document.querySelector('.nav-subtitle');
        if (titleEl) titleEl.textContent = title;
        if (subtitleEl) subtitleEl.textContent = subtitle;
    },

    afterRender(pageName) {
        const container = document.getElementById('page-container');
        if (!container) return;
        container.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        const firstChild = container.firstElementChild;
        if (firstChild && pageName !== 'auth') {
            firstChild.classList.add('page-view-enter');
        }
    }
};

// Listen for hash changes
window.addEventListener('hashchange', () => PageRouter.route());

// 底部导航栏事件绑定 & 初始化
document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
    BottomSheet.init();

    // Bind bottom nav
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const page = this.dataset.page;
            if (page) PageRouter.navigate(page);
        });
    });

    // Bind top nav notification icon
    const notifBtn = document.getElementById('btn-notifications');
    if (notifBtn) {
        notifBtn.addEventListener('click', () => PageRouter.navigate('profile'));
    }

    // Bind profile button
    const profileBtn = document.getElementById('btn-profile');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => PageRouter.navigate('profile'));
    }

    // Initial route
    const token = apiClient.getToken();
    if (!token) {
        PageRouter.navigate('auth');
    } else {
        PageRouter.navigate('home');
    }
    PageRouter.route();
});

// Global error boundary
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    Toast.show('应用发生错误，请刷新页面');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled rejection:', e.reason);
    Toast.show(e.reason?.message || '操作失败，请重试');
    e.preventDefault();
});
