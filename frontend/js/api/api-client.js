// API 基础请求封装
const API_BASE_URL = 'http://localhost:8080/api';
const API_HEALTH_URL = `${API_BASE_URL}/health`;

const apiClient = {
    token: null,

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('selfpline_token', token);
        } else {
            localStorage.removeItem('selfpline_token');
        }
    },

    getToken() {
        if (!this.token) {
            this.token = localStorage.getItem('selfpline_token');
        }
        return this.token;
    },

    async request(method, path, body = null, timeoutMs = 30000) {
        const headers = { 'Content-Type': 'application/json' };
        const token = this.getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const config = {
                method,
                headers,
                signal: controller.signal,
            };
            if (body !== null && body !== undefined) {
                config.body = JSON.stringify(body);
            }

            const res = await fetch(`${API_BASE_URL}${path}`, config);
            clearTimeout(timeoutId);

            const text = await res.text();
            let json = null;
            try {
                json = text ? JSON.parse(text) : null;
            } catch (parseError) {
                json = null;
            }

            if (res.status === 401 || json?.code === 401) {
                this.setToken(null);
                if (path !== '/user/login' && path !== '/user/register' && typeof PageRouter !== 'undefined') {
                    PageRouter.navigate('auth');
                }
                throw new Error(path === '/user/login'
                    ? '账号或密码错误，请重新输入'
                    : '登录已过期，请重新登录');
            }

            if (res.status === 403 || json?.code === 403) {
                throw new Error('没有权限执行该操作，请重新登录后再试');
            }

            if (res.status === 404) {
                throw new Error('接口路径不存在，请检查前后端接口路径');
            }

            if (res.status >= 500) {
                throw new Error('后端服务异常，请查看后端日志');
            }

            if (!res.ok) {
                throw new Error(json?.msg || `请求失败(${res.status})`);
            }

            if (!json) {
                throw new Error('服务器返回格式异常');
            }

            if (json.code !== 200) {
                throw new Error(json.msg || '请求失败');
            }

            return json;
        } catch (e) {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') {
                throw new Error('请求超时，请确认后端服务是否正常运行');
            }
            if (this.isFetchConnectionError(e)) {
                throw new Error(await this.detectConnectionErrorMessage());
            }
            throw e;
        }
    },

    isFetchConnectionError(error) {
        const message = String(error?.message || '');
        return error instanceof TypeError
            || /Failed to fetch|NetworkError|Load failed/i.test(message);
    },

    async detectConnectionErrorMessage() {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            return '浏览器当前离线，请检查本机网络连接';
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        try {
            await fetch(API_HEALTH_URL, {
                method: 'GET',
                mode: 'no-cors',
                cache: 'no-store',
                signal: controller.signal
            });
            return '跨域请求被阻止，请检查后端 CORS 配置和前端端口';
        } catch (e) {
            return '后端服务未启动或无法连接，请先运行 mvn -f backend/pom.xml spring-boot:run';
        } finally {
            clearTimeout(timeoutId);
        }
    },

    get(path) { return this.request('GET', path); },
    post(path, body) { return this.request('POST', path, body); },
    put(path, body) { return this.request('PUT', path, body); },
    delete(path) { return this.request('DELETE', path); }
};
