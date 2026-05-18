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
                const serverMsg = json?.msg || json?.message;
                throw new Error(serverMsg || '后端服务异常，请查看后端日志');
            }

            if (!res.ok) {
                throw new Error(json?.msg || json?.message || `请求失败(${res.status})`);
            }

            if (!json) {
                throw new Error('服务器返回格式异常');
            }

            if (json.code !== 200) {
                throw new Error(json.msg || json.message || '请求失败');
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
    post(path, body, timeoutMs) { return this.request('POST', path, body, timeoutMs); },
    put(path, body) { return this.request('PUT', path, body); },
    delete(path) { return this.request('DELETE', path); },

    /**
     * Streaming SSE POST. Parses text/event-stream and calls callbacks per event.
     * @param {string} path - API path e.g. "/ai/coach-chat/stream"
     * @param {object} body - JSON request body
     * @param {object} callbacks - { onMeta, onToken, onPlanReady, onDone, onError }
     * @param {number} timeoutMs - timeout in ms (default 120000)
     * @returns {Promise<void>}
     */
    async streamPost(path, body, callbacks, timeoutMs = 120000) {
        const headers = { 'Content-Type': 'application/json' };
        const token = this.getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const handlers = callbacks || {};
        let finished = false;

        try {
            console.debug('[stream] start', path);
            const res = await fetch(`${API_BASE_URL}${path}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: controller.signal
            });

            if (res.status === 401) {
                this.setToken(null);
                if (typeof PageRouter !== 'undefined') {
                    PageRouter.navigate('auth');
                }
                throw new Error('登录已过期，请重新登录');
            }
            if (!res.ok) {
                const text = await res.text();
                let msg = text;
                try { const j = JSON.parse(text); msg = j.msg || j.message || text; } catch (e) {}
                throw new Error(msg || `请求失败(${res.status})`);
            }
            if (!res.body) {
                throw new Error('当前浏览器不支持流式响应读取');
            }
            const contentType = res.headers.get('Content-Type') || '';
            if (!contentType.includes('text/event-stream')) {
                console.warn('[stream] unexpected content-type:', contentType);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
                const parts = buffer.split('\n\n');
                buffer = parts.pop() || '';
                for (const rawEvent of parts) {
                    const shouldStop = this.dispatchSseEvent(rawEvent, handlers);
                    if (shouldStop) {
                        finished = true;
                        console.debug('[stream] done', path);
                        return;
                    }
                }
            }
            buffer += decoder.decode().replace(/\r\n/g, '\n');
            if (buffer.trim()) {
                finished = this.dispatchSseEvent(buffer, handlers) || finished;
            }
            if (!finished) {
                handlers.onDone && handlers.onDone({});
            }
        } catch (e) {
            if (e.name === 'AbortError') {
                handlers.onError && handlers.onError({ message: '请求超时，请重试' });
                return;
            }
            if (this.isFetchConnectionError(e)) {
                const detectMsg = await this.detectConnectionErrorMessage();
                handlers.onError && handlers.onError({ message: detectMsg });
                return;
            }
            handlers.onError && handlers.onError({ message: e.message || '流式请求失败' });
        } finally {
            clearTimeout(timeoutId);
        }
    },

    dispatchSseEvent(rawEvent, handlers = {}) {
        const lines = String(rawEvent || '').split('\n');
        let eventName = 'message';
        const dataLines = [];

        for (const line of lines) {
            if (!line || line.startsWith(':')) continue;
            if (line.startsWith('event:')) {
                eventName = line.slice(6).trim() || 'message';
            } else if (line.startsWith('data:')) {
                dataLines.push(line.slice(5).trimStart());
            }
        }

        const dataText = dataLines.join('\n');
        if (!dataText) return false;
        console.debug('[stream] event', eventName);
        if (dataText === '[DONE]') {
            handlers.onDone && handlers.onDone({ finishReason: 'stop' });
            return true;
        }

        let payload;
        try {
            payload = JSON.parse(dataText);
        } catch (e) {
            console.warn('SSE parse warning:', e.message, dataText.slice(0, 120));
            return false;
        }

        switch (eventName) {
            case 'meta':
                handlers.onMeta && handlers.onMeta(payload);
                break;
            case 'token':
                console.debug('[stream] token length', String(payload.content || '').length);
                handlers.onToken && handlers.onToken(payload);
                break;
            case 'planReady':
            case 'PLAN_READY':
            case 'plan-ready':
            case 'plan_ready':
                handlers.onPlanReady && handlers.onPlanReady(payload);
                break;
            case 'error':
                console.debug('[stream] error', payload.message || '');
                handlers.onError && handlers.onError(payload);
                return true;
            case 'done':
                console.debug('[stream] done event');
                handlers.onDone && handlers.onDone(payload);
                return true;
            default:
                handlers.onMessage && handlers.onMessage(payload, eventName);
                break;
        }
        return false;
    }
};
