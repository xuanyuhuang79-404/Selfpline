// API 基础请求封装
const API_BASE = 'http://localhost:8080/api';

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
            if (body) {
                config.body = JSON.stringify(body);
            }

            const res = await fetch(`${API_BASE}${path}`, config);
            clearTimeout(timeoutId);

            const text = await res.text();
            let json = null;
            try {
                json = text ? JSON.parse(text) : null;
            } catch (parseError) {
                throw new Error('服务器返回格式异常');
            }

            if (res.status === 401 || json?.code === 401) {
                this.setToken(null);
                if (typeof PageRouter !== 'undefined') {
                    PageRouter.navigate('auth');
                }
                throw new Error('登录已过期，请重新登录');
            }

            if (!res.ok) {
                throw new Error(json?.msg || `请求失败(${res.status})`);
            }

            if (!json) {
                throw new Error('服务器无响应内容');
            }

            if (json.code !== 200) {
                throw new Error(json.msg || '请求失败');
            }

            return json;
        } catch (e) {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') {
                throw new Error('请求超时，请检查网络');
            }
            if (e.message === 'Failed to fetch') {
                throw new Error('网络连接失败，请检查网络');
            }
            throw e;
        }
    },

    get(path) { return this.request('GET', path); },
    post(path, body) { return this.request('POST', path, body); },
    put(path, body) { return this.request('PUT', path, body); },
    delete(path) { return this.request('DELETE', path); }
};
