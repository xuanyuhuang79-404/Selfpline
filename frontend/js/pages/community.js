// 运动社区广场页面
const CommunityPage = {
    currentPage: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    likedPosts: new Set(),
    comments: {},

    async render() {
        document.getElementById('top-nav').classList.remove('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');
        document.getElementById('fab-add-habit').classList.add('hidden');

        const container = document.getElementById('page-container');
        container.innerHTML = `
            <div class="community-page">
                <div class="community-header">
                    <div>
                        <p class="page-kicker">运动社区</p>
                        <h2>分享你的执行现场</h2>
                    </div>
                    <button class="btn btn-primary community-publish-btn" onclick="CommunityPage.showCreateForm()">+ 发布动态</button>
                </div>
                <main class="community-main">
                    <div id="createPostForm" class="create-post-form hidden"></div>
                    <div id="postFeed" class="community-feed">
                        <div class="empty-state"><div class="empty-icon">\u{1F3CB}</div><div class="empty-title">加载中...</div></div>
                    </div>
                    <div id="loadMoreContainer" class="load-more-container hidden">
                        <div class="load-more" onclick="CommunityPage.loadMore()">加载更多</div>
                    </div>
                </main>
                <aside class="community-sidebar">
                    <section class="dashboard-card community-guide-card">
                        <h3>发布建议</h3>
                        <p>记录一次真实的训练、一次打卡阻力，或一个对你有效的小方法。</p>
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
        await this.loadFeed();
    },

    showCreateForm() {
        const formContainer = document.getElementById('createPostForm');
        formContainer.classList.remove('hidden');
        formContainer.innerHTML = `
            <div class="post-form">
                <textarea id="postContent" placeholder="分享你的运动时刻..." maxlength="500"
                    ></textarea>
                <input class="post-image-input" type="file" id="postImage" accept="image/*" onchange="CommunityPage.previewImage()">
                <img id="imagePreview" class="image-upload-preview hidden">
                <div class="post-form-actions">
                    <button class="btn btn-primary" id="btn-submit-post" onclick="CommunityPage.submitPost()">发布</button>
                    <button class="btn btn-text post-cancel-btn" onclick="CommunityPage.cancelPost()">取消</button>
                </div>
            </div>
        `;
    },

    previewImage() {
        const file = document.getElementById('postImage').files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('imagePreview');
            preview.src = e.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    },

    async submitPost() {
        const content = document.getElementById('postContent').value.trim();
        if (!content) { Toast.show('请输入内容'); return; }
        const previewImg = document.getElementById('imagePreview');
        const imageUrl = previewImg && !previewImg.classList.contains('hidden') ? previewImg.src : '';
        const submitBtn = document.getElementById('btn-submit-post');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('btn-loading'); }

        const params = new URLSearchParams({ content });
        if (imageUrl) params.append('imageUrl', imageUrl);

        try {
            await apiClient.post('/community/post?' + params.toString());
            Toast.show('发布成功');
            this.cancelPost();
            this.currentPage = 1;
            this.loadFeed();
        } catch (e) {
            Toast.show('发布失败: ' + e.message);
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('btn-loading'); }
        }
    },

    cancelPost() {
        document.getElementById('createPostForm').classList.add('hidden');
    },

    async loadFeed() {
        if (this.loading) return;
        this.loading = true;
        try {
            const result = await apiClient.get('/community/feed?page=' + this.currentPage + '&size=' + this.pageSize);
            const posts = result.data || [];
            const feedContainer = document.getElementById('postFeed');

            if (this.currentPage === 1) {
                if (!posts || posts.length === 0) {
                    feedContainer.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon">\u{1F4DD}</div>
                            <div class="empty-title">还没有动态</div>
                            <div class="empty-desc">成为第一个分享的人吧</div>
                            <button class="empty-cta" onclick="CommunityPage.showCreateForm()">发布动态</button>
                        </div>`;
                    document.getElementById('loadMoreContainer').classList.add('hidden');
                    return;
                }
                feedContainer.innerHTML = '';
            }

            posts.forEach(post => this.renderPost(post, feedContainer));

            this.hasMore = posts.length === this.pageSize;
            document.getElementById('loadMoreContainer').classList.toggle('hidden', !this.hasMore);
        } catch (e) {
            if (this.currentPage === 1) {
                document.getElementById('postFeed').innerHTML = `<div class="empty-state"><div class="empty-icon">\u{1F635}</div><div class="empty-title">加载失败</div><div class="empty-desc">${this.escapeHtml(e.message || '请稍后重试')}</div></div>`;
            }
        } finally {
            this.loading = false;
        }
    },

    renderPost(post, container) {
        const card = document.createElement('div');
        card.className = 'post-card';
        card.id = 'post-' + post.id;
        card.innerHTML = `
            ${post.imageUrl ? '<img class="post-image" src="' + post.imageUrl + '" alt="动态图片" loading="lazy">' : ''}
            <div class="post-content">${this.escapeHtml(post.content || '')}</div>
            <div class="post-actions">
                <button class="like-btn${this.likedPosts.has(post.id) ? ' liked' : ''}" onclick="CommunityPage.toggleLike(${post.id})"
                    >
                    ❤️ <span id="likeCount-${post.id}">${post.likeCount || 0}</span>
                </button>
                <button class="like-btn" onclick="CommunityPage.showComments(${post.id})"
                    >
                    💬 <span id="commentCount-${post.id}">${post.commentCount || 0}</span>
                </button>
                <span class="post-time">${this.formatTime(post.createTime)}</span>
            </div>
            <div id="comments-${post.id}" class="comment-section hidden"></div>
        `;
        container.appendChild(card);
    },

    async toggleLike(postId) {
        var btn = document.querySelector('#post-' + postId + ' .like-btn');
        var countSpan = document.getElementById('likeCount-' + postId);
        if (!btn || !countSpan) return;
        var wasLiked = this.likedPosts.has(postId);
        var currentCount = parseInt(countSpan.textContent) || 0;

        // Optimistic update
        if (wasLiked) {
            this.likedPosts.delete(postId);
        } else {
            this.likedPosts.add(postId);
        }
        btn.classList.toggle('liked');
        countSpan.textContent = wasLiked ? currentCount - 1 : currentCount + 1;

        try {
            await apiClient.post('/community/post/' + postId + '/like');
        } catch (e) {
            // Revert on failure
            btn.classList.toggle('liked');
            countSpan.textContent = currentCount;
            if (wasLiked) {
                this.likedPosts.add(postId);
            } else {
                this.likedPosts.delete(postId);
            }
            Toast.show('操作失败: ' + e.message);
        }
    },

    showComments(postId) {
        var container = document.getElementById('comments-' + postId);
        if (!container) return;
        if (container.classList.contains('hidden')) {
            container.classList.remove('hidden');
            this.renderComments(postId);
        } else {
            container.classList.add('hidden');
        }
    },

    renderComments(postId) {
        var container = document.getElementById('comments-' + postId);
        if (!container) return;
        var postComments = this.comments[postId] || [];
        container.innerHTML = `
            ${postComments.map(function(c) {
                return '<div class="comment-item">' +
                    '<div class="comment-author">用户</div>' +
                    '<div class="comment-body">' + CommunityPage.escapeHtml(c) + '</div>' +
                '</div>';
            }).join('')}
            <div class="comment-input-row">
                <input type="text" id="commentInput-${postId}" placeholder="添加评论..." maxlength="200"
                    >
                <button onclick="CommunityPage.addComment(${postId})">发送</button>
            </div>
        `;
    },

    addComment(postId) {
        var input = document.getElementById('commentInput-' + postId);
        if (!input) return;
        var text = input.value.trim();
        if (!text) return;
        if (!this.comments[postId]) this.comments[postId] = [];
        this.comments[postId].push(text);

        // Update comment count display
        var countSpan = document.getElementById('commentCount-' + postId);
        if (countSpan) countSpan.textContent = this.comments[postId].length;

        input.value = '';
        this.renderComments(postId);
    },

    loadMore() {
        this.currentPage++;
        this.loadFeed();
    },

    escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatTime(dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr);
        var now = new Date();
        var diff = now - d;
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
        if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
};
