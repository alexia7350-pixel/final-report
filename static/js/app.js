/**
 * Homework Reminder Management System - Dashboard Logic
 * Powered by Antigravity AI
 */

document.addEventListener('DOMContentLoaded', () => {
    // Core Application State
    let assignments = [];
    let currentFilter = 'all'; // 'all', 'pending', 'completed'
    let countdownIntervalId = null;

    // Toast Container Initialization
    const toastContainer = document.createElement('div');
    toastContainer.className = 'alert-banner-container';
    document.body.appendChild(toastContainer);

    // Dynamic Toast function
    window.showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `alert-banner glass-panel ${type}`;
        
        let icon = '🔔';
        if (type === 'success') icon = '✅';
        if (type === 'danger') icon = '❌';
        if (type === 'warning') icon = '⚠️';
        if (type === 'info') icon = 'ℹ️';

        toast.innerHTML = `
            <span style="display: flex; align-items: center; gap: 0.5rem;">
                <span>${icon}</span>
                <span>${message}</span>
            </span>
            <button class="alert-close">&times;</button>
        `;
        
        toastContainer.appendChild(toast);

        // Bind close button
        toast.querySelector('.alert-close').addEventListener('click', () => {
            toast.remove();
        });

        // Auto remove after 4.5s
        setTimeout(() => {
            toast.style.transition = 'opacity 0.5s ease';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 4500);
    };

    // Load Flash messages from server if any exist in the page HTML
    const serverFlashes = document.querySelectorAll('.server-flash');
    serverFlashes.forEach(flash => {
        showToast(flash.dataset.message, flash.dataset.category);
    });

    // =========================================================================
    // DOM Elements
    // =========================================================================
    const assignmentsList = document.getElementById('assignments-list');
    const totalCountEl = document.getElementById('total-count');
    const pendingCountEl = document.getElementById('pending-count');
    const completedCountEl = document.getElementById('completed-count');
    const urgentPanel = document.getElementById('urgent-panel');
    const urgentTitle = document.getElementById('urgent-title');
    const urgentCourse = document.getElementById('urgent-course');
    const urgentTimer = document.getElementById('urgent-timer');
    const notificationList = document.getElementById('notification-list');

    // Filter button bindings
    const filterAllBtn = document.getElementById('filter-all');
    const filterPendingBtn = document.getElementById('filter-pending');
    const filterCompletedBtn = document.getElementById('filter-completed');

    if (filterAllBtn) {
        filterAllBtn.addEventListener('click', () => setFilter('all'));
        filterPendingBtn.addEventListener('click', () => setFilter('pending'));
        filterCompletedBtn.addEventListener('click', () => setFilter('completed'));
    }

    // Modal Control Elements
    const addModal = document.getElementById('add-modal');
    const openAddModalBtn = document.getElementById('btn-open-add');
    const closeAddModalBtn = document.getElementById('btn-close-add');
    const addForm = document.getElementById('add-assignment-form');

    if (openAddModalBtn) {
        openAddModalBtn.addEventListener('click', () => addModal.style.display = 'flex');
        closeAddModalBtn.addEventListener('click', () => addModal.style.display = 'none');
        window.addEventListener('click', (e) => {
            if (e.target === addModal) addModal.style.display = 'none';
        });
    }

    // Email Save Binding
    const saveEmailBtn = document.getElementById('btn-save-email');
    const emailInput = document.getElementById('user-email');
    if (saveEmailBtn) {
        saveEmailBtn.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            try {
                const res = await fetch('/api/profile/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message, 'success');
                } else {
                    showToast(data.error || '儲存失敗', 'danger');
                }
            } catch (err) {
                showToast('網路連線異常，請重試！', 'danger');
            }
        });
    }

    // LINE Direct Token Save Binding
    const saveLineTokenBtn = document.getElementById('btn-save-line-token');
    const lineTokenInput = document.getElementById('line-token-direct');
    if (saveLineTokenBtn) {
        saveLineTokenBtn.addEventListener('click', async () => {
            const token = lineTokenInput.value.trim();
            try {
                const res = await fetch('/api/profile/save-line-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ line_token: token })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message, 'success');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    showToast(data.error || '綁定失敗', 'danger');
                }
            } catch (err) {
                showToast('網路連線異常，請重試！', 'danger');
            }
        });
    }

    // LINE Unbind Action
    const unbindLineBtn = document.getElementById('btn-unbind-line');
    if (unbindLineBtn) {
        unbindLineBtn.addEventListener('click', async () => {
            if (!confirm('您確定要解除 LINE Notify 帳號綁定嗎？')) return;
            try {
                const res = await fetch('/line/unbind', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message, 'success');
                    setTimeout(() => window.location.reload(), 1500);
                }
            } catch (err) {
                showToast('解除綁定失敗！', 'danger');
            }
        });
    }

    // Clear Notification History Binding
    const clearNotifBtn = document.getElementById('btn-clear-notif');
    if (clearNotifBtn) {
        clearNotifBtn.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/notifications/clear', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message, 'success');
                    fetchNotifications(); // Reload list
                }
            } catch (err) {
                showToast('清除紀錄失敗！', 'danger');
            }
        });
    }

    // =========================================================================
    // CRUD Operations & Rendering
    // =========================================================================

    // Fetch assignments from Backend API
    async function fetchAssignments() {
        try {
            const res = await fetch('/api/assignments');
            if (res.status === 401) {
                window.location.href = '/login';
                return;
            }
            assignments = await res.json();
            updateDashboard();
        } catch (err) {
            console.error('Error fetching assignments:', err);
            showToast('無法載入作業資料，請重新整理網頁！', 'danger');
        }
    }

    // Set active filter
    function setFilter(filter) {
        currentFilter = filter;
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        
        if (filter === 'all') filterAllBtn.classList.add('active');
        if (filter === 'pending') filterPendingBtn.classList.add('active');
        if (filter === 'completed') filterCompletedBtn.classList.add('active');
        
        renderAssignments();
    }

    // Core Dashboard calculations and triggers
    function updateDashboard() {
        // Calculate counter stats
        const total = assignments.length;
        const pending = assignments.filter(a => a.status === 'pending').length;
        const completed = assignments.filter(a => a.status === 'completed').length;

        if (totalCountEl) totalCountEl.textContent = total;
        if (pendingCountEl) pendingCountEl.textContent = pending;
        if (completedCountEl) completedCountEl.textContent = completed;

        // Render current list view
        renderAssignments();

        // Calculate and display top urgent deadline countdown
        updateUrgentDeadline();
    }

    // Redraw Assignment List elements
    function renderAssignments() {
        if (!assignmentsList) return;
        assignmentsList.innerHTML = '';

        let filtered = assignments;
        if (currentFilter === 'pending') filtered = assignments.filter(a => a.status === 'pending');
        if (currentFilter === 'completed') filtered = assignments.filter(a => a.status === 'completed');

        if (filtered.length === 0) {
            assignmentsList.innerHTML = `
                <div class="empty-assignments-view">
                    <div class="empty-icon">📅</div>
                    <p>${currentFilter === 'completed' ? '目前沒有已完成的作業。' : (currentFilter === 'pending' ? '恭喜！目前沒有待辦作業。' : '目前尚無任何作業項目，點擊上方按鈕新增！')}</p>
                </div>
            `;
            return;
        }

        filtered.forEach(ass => {
            const card = document.createElement('div');
            card.className = `assignment-card glass-panel ${ass.status === 'completed' ? 'completed' : ''}`;
            card.id = `assignment-card-${ass.id}`;

            const dateObj = new Date(ass.deadline);
            const dateStr = dateObj.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', weekday: 'short' });
            const timeStr = dateObj.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });

            card.innerHTML = `
                <!-- Checkbox -->
                <label class="checkbox-container">
                    <input type="checkbox" ${ass.status === 'completed' ? 'checked' : ''} onclick="toggleStatus(${ass.id})">
                    <span class="checkmark"></span>
                </label>
                
                <!-- Info Section -->
                <div class="card-info">
                    <div class="card-title-row">
                        <span class="card-title">${escapeHTML(ass.title)}</span>
                        <span class="card-course-badge">${escapeHTML(ass.course_name)}</span>
                    </div>
                    ${ass.description ? `<p class="card-desc">${escapeHTML(ass.description)}</p>` : ''}
                    <div class="card-deadline-info">
                        <span>⏰ 提前 ${ass.remind_before_hours} 小時提醒</span>
                    </div>
                </div>

                <!-- Deadline text -->
                <div class="card-time">
                    <div class="deadline-date">${dateStr}</div>
                    <div class="deadline-time">${timeStr}</div>
                </div>

                <!-- Actions -->
                <div class="card-actions">
                    <button class="btn-action delete" onclick="deleteAssignment(${ass.id})" title="刪除作業">🗑️</button>
                </div>
            `;
            assignmentsList.appendChild(card);
        });
    }

    // Toggle Check Status
    window.toggleStatus = async (id) => {
        try {
            const res = await fetch(`/api/assignments/${id}/toggle`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast(data.message, data.status === 'completed' ? 'success' : 'info');
                
                // Animate card before reload
                const card = document.getElementById(`assignment-card-${id}`);
                if (card) {
                    card.style.transition = 'all 0.4s ease';
                    card.style.transform = 'scale(0.97)';
                    card.style.opacity = '0.7';
                }
                
                // Wait slightly for smooth transition feel, then fetch fresh state
                setTimeout(() => {
                    fetchAssignments();
                    fetchNotifications(); // Completed status might add mock notifications
                }, 300);
            }
        } catch (err) {
            showToast('更新作業狀態失敗！', 'danger');
        }
    };

    // Delete Assignment
    window.deleteAssignment = async (id) => {
        if (!confirm('您確定要刪除這項作業項目嗎？')) return;
        try {
            const res = await fetch(`/api/assignments/${id}/delete`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast(data.message, 'warning');
                fetchAssignments();
            }
        } catch (err) {
            showToast('刪除作業失敗！', 'danger');
        }
    };

    // Add new Assignment Form Submission
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const title = document.getElementById('ass-title').value.trim();
            const course_name = document.getElementById('ass-course').value.trim();
            const deadline = document.getElementById('ass-deadline').value;
            const remind_before_hours = document.getElementById('ass-remind').value;
            const description = document.getElementById('ass-desc').value.trim();

            if (!title || !course_name || !deadline) {
                showToast('請填寫所有必填欄位！', 'warning');
                return;
            }

            try {
                const res = await fetch('/api/assignments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title,
                        course_name,
                        deadline,
                        remind_before_hours: parseInt(remind_before_hours),
                        description
                    })
                });

                const data = await res.json();
                if (data.success) {
                    showToast(data.message, 'success');
                    addForm.reset();
                    addModal.style.display = 'none';
                    fetchAssignments();
                } else {
                    showToast(data.error || '新增失敗', 'danger');
                }
            } catch (err) {
                showToast('網路出錯，無法新增作業！', 'danger');
            }
        });
    }

    // =========================================================================
    // High-Fidelity Real-time Countdown clock
    // =========================================================================
    function updateUrgentDeadline() {
        // Clear any ongoing intervals
        if (countdownIntervalId) {
            clearInterval(countdownIntervalId);
            countdownIntervalId = null;
        }

        // Filter out pending assignments
        const pending = assignments.filter(a => a.status === 'pending');
        
        if (pending.length === 0) {
            if (urgentPanel) urgentPanel.style.display = 'none';
            return;
        }

        // Find the one with the closest future deadline, or already overdue but still pending
        // Sort by deadline ascending
        const sorted = [...pending].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        const urgentAss = sorted[0];

        if (!urgentAss) {
            if (urgentPanel) urgentPanel.style.display = 'none';
            return;
        }

        if (urgentPanel) urgentPanel.style.display = 'flex';
        if (urgentTitle) urgentTitle.textContent = urgentAss.title;
        if (urgentCourse) urgentCourse.textContent = urgentAss.course_name;

        const targetDate = new Date(urgentAss.deadline);

        // Core ticking function
        function tick() {
            const now = new Date();
            const diffMs = targetDate - now;

            if (diffMs <= 0) {
                // Overdue!
                const elapsedMs = Math.abs(diffMs);
                const days = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
                const hours = Math.floor((elapsedMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((elapsedMs % (1000 * 60)) / 1000);
                
                urgentTimer.style.color = 'var(--neon-red)';
                urgentTimer.style.textShadow = '0 0 8px rgba(255, 85, 85, 0.4)';
                
                let timeStr = '⚠️ 已逾期 ';
                if (days > 0) timeStr += `${days} 天 `;
                timeStr += `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
                urgentTimer.textContent = timeStr;
            } else {
                // Active countdown
                const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

                // Orange alert color if less than 6 hours
                if (diffMs < 6 * 60 * 60 * 1000) {
                    urgentTimer.style.color = 'var(--neon-red)';
                    urgentTimer.style.textShadow = '0 0 10px rgba(255, 85, 85, 0.5)';
                } else {
                    urgentTimer.style.color = 'var(--neon-orange)';
                    urgentTimer.style.textShadow = '0 0 8px rgba(245, 158, 11, 0.4)';
                }

                let timeStr = '';
                if (days > 0) timeStr += `${days} 天 `;
                timeStr += `${padZero(hours)} 時 ${padZero(minutes)} 分 ${padZero(seconds)} 秒`;
                urgentTimer.textContent = timeStr;
            }
        }

        // Run immediately and then start interval loop
        tick();
        countdownIntervalId = setInterval(tick, 1000);
    }

    // Helper functions
    function padZero(num) {
        return num.toString().padStart(2, '0');
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // =========================================================================
    // Notifications Logger Feed
    // =========================================================================
    async function fetchNotifications() {
        if (!notificationList) return;
        try {
            const res = await fetch('/api/notifications');
            const data = await res.json();
            
            notificationList.innerHTML = '';
            
            if (data.length === 0) {
                notificationList.innerHTML = `
                    <div class="notif-empty">
                        <span>📭 目前無推播提醒紀錄。</span>
                    </div>
                `;
                return;
            }

            data.forEach(log => {
                const item = document.createElement('div');
                item.className = 'notif-item';
                
                item.innerHTML = `
                    <div class="notif-item-header">
                        <span class="notif-tag ${log.status === 'success' ? 'success' : 'failed'}">
                            ${log.status === 'success' ? '發送成功' : '發送失敗'}
                        </span>
                        <span class="notif-time">${log.triggered_at}</span>
                    </div>
                    <div class="notif-content">${escapeHTML(log.message)}</div>
                `;
                notificationList.appendChild(item);
            });
        } catch (err) {
            console.error('Error fetching notification logs:', err);
        }
    }

    // =========================================================================
    // Core Initializer Execution
    // =========================================================================
    if (assignmentsList) {
        fetchAssignments();
        fetchNotifications();
        
        // Auto-poll notification history and assignment states in background every 15 seconds to sync scheduler actions
        setInterval(() => {
            fetchAssignments();
            fetchNotifications();
        }, 15000);
    }
});
