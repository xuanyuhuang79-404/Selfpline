// 社区核心模块：发布、真实点赞、真实评论、加载更多
const CommunityPage = {
    currentPage: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    pendingLikes: new Set(),
    pendingComments: new Set(),
    commentsByPost: {},

    async render() {
        document.getElementById('top-nav').classList.remove('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');
        document.getElementById('fab-add-habit').classList.add('hidden');

        const container = document.getElementById('page-container');
        container.innerHTML = `
            <div class="community-page">
                <div class="community-header">
                    <div>
                        <p class="page-kicker">Community</p>
                        <h2>分享你的执行现场</h2>
                    </div>
                    <button class="btn btn-primary community-publish-btn" type="button" onclick="CommunityPage.showCreateForm()">发布动态</button>
                </div>
                <main class="community-main">
                    <div id="createPostForm" class="create-post-form hidden"></div>
                    <div id="postFeed" class="community-feed">
                        <div class="empty-state"><div class="empty-title">加载中...</div></div>
                    </div>
                    <div id="loadMoreContainer" class="load-more-container hidden">
                        <button class="load-more" type="button" onclick="CommunityPage.loadMore()">加载更多</button>
                    </div>
                </main>
                <aside class="community-sidebar">
                    <section class="dashboard-card community-guide-card">
                        <h3>发布建议</h3>
                        <p>记录一次真实训练、一次打卡阻力，或一个对你有效的小方法。</p>
                    </section>
                    <section class="dashboard-card community-guide-card">
                        <h3>互动原则</h3>
                        <p>多给具体鼓励，少给绝对判断。每个人的节奏都可以被尊重。</p>
                    </section>
                </aside>
            </div>
        `;
        this.currentPage = 1;
        this.hasMore = true;
        this.commentsByPost = {};
        await this.loadFeed();
    },

    showCreateForm() {
        const formContainer = document.getElementById('createPostForm');
        if (!formContainer) return;
        formContainer.classList.remove('hidden');
        formContainer.innerHTML = `
            <form class="post-form" id="community-post-form">
                <textarea id="postContent" placeholder="分享你的运动时刻..." maxlength="500"></textarea>
                <input class="post-image-url-input" type="url" id="postImageUrl" maxlength="255" placeholder="图片链接（可选）">
                <input class="post-image-input" type="file" id="postImage" accept="image/*">
                <img id="imagePreview" class="image-upload-preview hidden" alt="图片预览">
                <div class="post-form-actions">
                    <button class="btn btn-primary" id="btn-submit-post" type="submit">发布</button>
                    <button class="btn btn-text post-cancel-btn" type="button" onclick="CommunityPage.cancelPost()">取消</button>
                </div>
            </form>
        `;
        document.getElementById('postImage')?.addEventListener('change', () => this.previewImage());
        document.getElementById('community-post-form')?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.submitPost();
        });
    },

    previewImage() {
        const file = document.getElementById('postImage')?.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            Toast.show('请选择图片文件');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('imagePreview');
            if (!preview) return;
            preview.src = e.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    },

    async submitPost() {
        const content = document.getElementById('postContent')?.value?.trim() || '';
        const imageUrl = document.getElementById('postImageUrl')?.value?.trim() || '';
        if (!content) {
            Toast.show('请输入内容');
            return;
        }
        if (content.length > 500) {
            Toast.show('动态内容最多500个字符');
            return;
        }
        if (imageUrl && !this.isSafeImageUrl(imageUrl)) {
            Toast.show('图片链接需要是 http(s) 地址且不超过255个字符');
            return;
        }
        const submitBtn = document.getElementById('btn-submit-post');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('btn-loading');
        }

        const params = new URLSearchParams({ content });
        if (imageUrl) params.append('imageUrl', imageUrl);

        try {
            await apiClient.post('/community/post?' + params.toString());
            Toast.show('发布成功');
            this.cancelPost();
            this.currentPage = 1;
            await this.loadFeed();
        } catch (e) {
            Toast.show('发布失败: ' + e.message);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('btn-loading');
            }
        }
    },

    cancelPost() {
        const form = document.getElementById('createPostForm');
        if (!form) return;
        form.classList.add('hidden');
        form.innerHTML = '';
    },

    async loadFeed() {
        if (this.loading) return;
        this.loading = true;
        const feedContainer = document.getElementById('postFeed');
        const loadMore = document.getElementById('loadMoreContainer');
        try {
            const result = await apiClient.get(`/community/feed?page=${this.currentPage}&size=${this.pageSize}`);
            const posts = Array.isArray(result.data) ? result.data : [];

            if (this.currentPage === 1) {
                if (!posts.length) {
                    feedContainer.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-title">还没有动态</div>
                            <div class="empty-desc">成为第一个分享的人吧。</div>
                            <button class="empty-cta" onclick="CommunityPage.showCreateForm()">发布动态</button>
                        </div>
                    `;
                    loadMore?.classList.add('hidden');
                    return;
                }
                feedContainer.innerHTML = '';
            }

            posts.forEach(post => this.renderPost(post, feedContainer));
            this.hasMore = posts.length === this.pageSize;
            loadMore?.classList.toggle('hidden', !this.hasMore);
        } catch (e) {
            if (this.currentPage === 1 && feedContainer) {
                feedContainer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-title">加载失败</div>
                        <div class="empty-desc">${this.escapeHtml(e.message || '请稍后重试')}</div>
                    </div>
                `;
            } else {
                Toast.show('加载失败: ' + e.message);
            }
        } finally {
            this.loading = false;
        }
    },

    renderPost(post, container) {
        const card = document.createElement('article');
        card.className = 'post-card';
        card.id = 'post-' + post.id;
        const image = this.isSafeImageUrl(post.imageUrl)
            ? `<img class="post-image" src="${this.escapeAttr(post.imageUrl)}" alt="动态图片" loading="lazy">`
            : '';
        card.innerHTML = `
            <div class="post-author-row">
                <span class="post-avatar">${this.escapeHtml((post.username || 'S').slice(0, 1).toUpperCase())}</span>
                <div>
                    <strong>${this.escapeHtml(post.username || 'Selfpline 用户')}</strong>
                    <small>${this.formatTime(post.createTime)}</small>
                </div>
            </div>
            ${image}
            <div class="post-content">${this.escapeHtml(post.content || '')}</div>
            <div class="post-actions">
                <button id="likeBtn-${post.id}" class="like-btn${post.likedByMe ? ' liked' : ''}" type="button" onclick="CommunityPage.toggleLike(${post.id})">
                    <span>${post.likedByMe ? '♥' : '♡'}</span>
                    <span id="likeCount-${post.id}">${post.likeCount || 0}</span>
                </button>
                <button class="like-btn" type="button" onclick="CommunityPage.toggleComments(${post.id})">
                    <span>💬</span>
                    <span id="commentCount-${post.id}">${post.commentCount || 0}</span>
                </button>
            </div>
            <div id="comments-${post.id}" class="comment-section hidden"></div>
        `;
        container.appendChild(card);
    },

    async toggleLike(postId) {
        if (this.pendingLikes.has(postId)) return;
        const btn = document.getElementById('likeBtn-' + postId);
        const countSpan = document.getElementById('likeCount-' + postId);
        this.pendingLikes.add(postId);
        if (btn) btn.disabled = true;
        try {
            const result = await apiClient.post('/community/post/' + postId + '/like');
            const data = result.data || {};
            if (btn) {
                btn.classList.toggle('liked', Boolean(data.liked));
                btn.querySelector('span').textContent = data.liked ? '♥' : '♡';
            }
            if (countSpan) countSpan.textContent = data.likeCount ?? countSpan.textContent;
        } catch (e) {
            Toast.show('操作失败: ' + e.message);
        } finally {
            this.pendingLikes.delete(postId);
            if (btn) btn.disabled = false;
        }
    },

    async toggleComments(postId) {
        const container = document.getElementById('comments-' + postId);
        if (!container) return;
        if (container.classList.contains('hidden')) {
            container.classList.remove('hidden');
            await this.loadComments(postId);
        } else {
            container.classList.add('hidden');
        }
    },

    async loadComments(postId) {
        const container = document.getElementById('comments-' + postId);
        if (!container) return;
        container.innerHTML = '<div class="comment-loading">评论加载中...</div>';
        try {
            const result = await apiClient.get(`/community/post/${postId}/comments`);
            this.commentsByPost[postId] = Array.isArray(result.data) ? result.data : [];
            this.renderComments(postId);
        } catch (e) {
            container.innerHTML = `<div class="comment-empty">评论加载失败：${this.escapeHtml(e.message)}</div>`;
        }
    },

    renderComments(postId) {
        const container = document.getElementById('comments-' + postId);
        if (!container) return;
        const comments = this.commentsByPost[postId] || [];
        container.innerHTML = `
            <div class="comment-list">
                ${comments.length ? comments.map(comment => `
                    <div class="comment-item">
                        <div class="comment-author">${this.escapeHtml(comment.username || 'Selfpline 用户')}</div>
                        <div class="comment-body">${this.escapeHtml(comment.content || '')}</div>
                    </div>
                `).join('') : '<div class="comment-empty">还没有评论，写下第一句回应。</div>'}
            </div>
            <form class="comment-input-row" id="commentForm-${postId}">
                <input type="text" id="commentInput-${postId}" placeholder="添加评论..." maxlength="200">
                <button type="submit" id="commentSubmit-${postId}">发送</button>
            </form>
        `;
        document.getElementById('commentForm-' + postId)?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.addComment(postId);
        });
    },

    async addComment(postId) {
        if (this.pendingComments.has(postId)) return;
        const input = document.getElementById('commentInput-' + postId);
        const submit = document.getElementById('commentSubmit-' + postId);
        const text = input?.value?.trim() || '';
        if (!text) {
            Toast.show('请输入评论内容');
            return;
        }
        if (text.length > 200) {
            Toast.show('评论最多200个字符');
            return;
        }
        this.pendingComments.add(postId);
        if (submit) submit.disabled = true;
        try {
            const result = await apiClient.post(`/community/post/${postId}/comment`, { content: text });
            const created = result.data;
            if (!Array.isArray(this.commentsByPost[postId])) {
                this.commentsByPost[postId] = [];
            }
            this.commentsByPost[postId].push(created);
            const countSpan = document.getElementById('commentCount-' + postId);
            if (countSpan) countSpan.textContent = String((Number(countSpan.textContent) || 0) + 1);
            this.renderComments(postId);
        } catch (e) {
            Toast.show('评论失败: ' + e.message);
        } finally {
            this.pendingComments.delete(postId);
            if (submit) submit.disabled = false;
        }
    },

    loadMore() {
        if (!this.hasMore || this.loading) return;
        this.currentPage++;
        this.loadFeed();
    },

    isSafeImageUrl(url) {
        if (!url) return false;
        if (url.length > 255) return false;
        return /^https?:\/\//i.test(url);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    },

    escapeAttr(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    formatTime(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return '';
        const now = new Date();
        const diff = now - d;
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
        if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
};
