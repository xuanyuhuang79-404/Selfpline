// 认证页面
const AuthPage = {
    render() {
        document.getElementById('top-nav').classList.add('hidden');
        document.getElementById('bottom-nav').classList.add('hidden');
        document.getElementById('fab-add-habit').classList.add('hidden');

        document.getElementById('page-container').innerHTML = `
            <div class="auth-container">
                <div class="auth-card" id="auth-card">
                    <h2 id="auth-title">登录 Selfpline</h2>
                    <div id="auth-form"></div>
                    <button class="btn btn-text auth-toggle-btn" id="auth-toggle">还没有账号？去注册</button>
                </div>
            </div>
        `;

        this.showLogin();
        document.getElementById('auth-toggle').addEventListener('click', () => this.toggle());
    },

    showLogin() {
        document.getElementById('auth-title').textContent = '登录 Selfpline';
        document.getElementById('auth-form').innerHTML = `
            <div class="form-group"><input id="login-username" placeholder="用户名"></div>
            <div class="form-group"><input id="login-password" type="password" placeholder="密码"></div>
            <button class="btn btn-primary" id="btn-login">登录</button>
        `;
        document.getElementById('auth-toggle').textContent = '还没有账号？去注册';
        document.getElementById('btn-login').addEventListener('click', () => this.login());
    },

    showRegister() {
        document.getElementById('auth-title').textContent = '注册 Selfpline';
        document.getElementById('auth-form').innerHTML = `
            <div class="form-group"><input id="reg-username" placeholder="用户名"></div>
            <div class="form-group"><input id="reg-password" type="password" placeholder="密码"></div>
            <div class="form-group"><input id="reg-height" type="number" step="0.1" placeholder="身高 (cm)"></div>
            <div class="form-group"><input id="reg-weight" type="number" step="0.1" placeholder="体重 (kg)"></div>
            <div class="form-group"><input id="reg-goal" placeholder="健身目标（如：减脂到65kg）"></div>
            <div class="form-group"><textarea id="reg-history" placeholder="病史（用于AI安全指导）" rows="2"></textarea></div>
            <button class="btn btn-primary" id="btn-register">注册</button>
        `;
        document.getElementById('auth-toggle').textContent = '已有账号？去登录';
        document.getElementById('btn-register').addEventListener('click', () => this.register());
    },

    toggle() {
        if (document.getElementById('btn-login')) {
            this.showRegister();
        } else {
            this.showLogin();
        }
    },

    async login() {
        const username = document.getElementById('login-username')?.value?.trim();
        const password = document.getElementById('login-password')?.value?.trim();

        // Validate
        if (!username) { Toast.show('请输入用户名'); return; }
        if (!password) { Toast.show('请输入密码'); return; }
        if (password.length < 6) { Toast.show('密码至少6位'); return; }

        const btn = document.querySelector('#auth-form .btn-primary');
        if (btn) { btn.disabled = true; btn.classList.add('btn-loading'); }

        try {
            const result = await apiClient.post('/user/login', { username, password });
            apiClient.setToken(result.data.token);
            Toast.show('登录成功');
            PageRouter.navigate('home');
        } catch (e) {
            Toast.show(e.message || '登录失败');
        } finally {
            if (btn) { btn.disabled = false; btn.classList.remove('btn-loading'); }
        }
    },

    async register() {
        const username = document.getElementById('reg-username')?.value?.trim();
        const password = document.getElementById('reg-password')?.value?.trim();
        const height = document.getElementById('reg-height')?.value;
        const weight = document.getElementById('reg-weight')?.value;
        const goal = document.getElementById('reg-goal')?.value?.trim();
        const history = document.getElementById('reg-history')?.value?.trim();

        // Validate
        if (!username || username.length < 2) { Toast.show('用户名至少2个字符'); return; }
        if (!password || password.length < 6) { Toast.show('密码至少6位'); return; }
        if (height && (isNaN(height) || height < 50 || height > 250)) { Toast.show('身高范围50-250cm'); return; }
        if (weight && (isNaN(weight) || weight < 20 || weight > 300)) { Toast.show('体重范围20-300kg'); return; }

        const btn = document.getElementById('btn-register');
        if (btn) { btn.disabled = true; btn.classList.add('btn-loading'); }

        const restoreBtn = () => {
            if (btn) { btn.disabled = false; btn.classList.remove('btn-loading'); }
        };

        try {
            await apiClient.post('/user/register', {
                username, password,
                height: height ? parseFloat(height) : null,
                weight: weight ? parseFloat(weight) : null,
                healthGoal: goal || null,
                medicalHistory: history || null
            });
            Toast.show('注册成功，请登录');
            this.showLogin();
        } catch (e) {
            Toast.show(e.message || '注册失败');
        } finally {
            restoreBtn();
        }
    }
};
