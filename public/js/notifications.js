// Notifications Module
const NotificationsModule = {
    init() {
        // Only initialize if we're on the notifications page
        if (!document.querySelector('.notification-item')) {
            return;
        }

        this.attachEventListeners();
    },

    attachEventListeners() {
        // Mark individual notifications as read
        document.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => this.markAsRead(item.dataset.id));
        });

        // Mark all as read button
        const markAllReadBtn = document.querySelector('.mark-all-read');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', () => this.markAllAsRead());
        }
    },

    async markAsRead(id) {
        try {
            await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
            const item = document.querySelector(`[data-id="${id}"]`);
            if (item) {
                item.classList.remove('unread');
                const badge = item.querySelector('.badge');
                if (badge) badge.remove();
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    },

    async markAllAsRead() {
        try {
            await fetch('/api/notifications/read-all', { method: 'POST' });
            document.querySelectorAll('.notification-item').forEach(item => {
                item.classList.remove('unread');
                const badge = item.querySelector('.badge');
                if (badge) badge.remove();
            });
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }
};

// Initialize only when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    NotificationsModule.init();
});