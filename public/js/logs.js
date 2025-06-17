const LogManager = {
    currentPage: 1,
    limit: 50,
    totalPages: 1,
    filters: {
        action: '',
        entity: '',
        startDate: '',
        endDate: ''
    },

    init: function () {
        this.initializeFilters();
        this.fetchLogs();
    },

    initializeFilters: function () {
        const actionFilter = document.getElementById('actionFilter');
        const entityFilter = document.getElementById('entityFilter');
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        const filterBtn = document.getElementById('filterBtn');

        if (actionFilter) {
            actionFilter.addEventListener('change', () => {
                this.filters.action = actionFilter.value;
            });
        }

        if (entityFilter) {
            entityFilter.addEventListener('change', () => {
                this.filters.entity = entityFilter.value;
            });
        }

        if (startDate) {
            startDate.addEventListener('change', () => {
                this.filters.startDate = startDate.value;
            });
        }

        if (endDate) {
            endDate.addEventListener('change', () => {
                this.filters.endDate = endDate.value;
            });
        }

        if (filterBtn) {
            filterBtn.addEventListener('click', () => {
                this.currentPage = 1;
                this.fetchLogs();
            });
        }
    },

    fetchLogs: async function () {
        try {
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: this.limit,
                ...this.filters
            });

            const response = await fetch(`/api/logs/paginated?${queryParams}`);
            const data = await response.json();

            if (data.success === false) {
                throw new Error(data.message);
            }

            this.updateLogsTable(data.logs);
            this.renderPagination(data.pagination);
        } catch (error) {
            console.error('Error fetching logs:', error);
            alert('Error fetching logs. Please try again later.');
        }
    },

    updateLogsTable: function (logs) {
        const tbody = document.querySelector('.logs-table tbody');
        if (!tbody) return;

        if (logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <i class="fas fa-info-circle text-muted mb-2"></i>
                        <p class="text-muted mb-0">No logs found</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.performedBy?.username || 'System'}</td>
                <td>
                    <span class="badge bg-${this.getActionBadgeClass(log.action)}">
                        ${log.action}
                    </span>
                </td>
                <td>${this.formatDetails(log)}</td>
                <td>${log.ipAddress || 'N/A'}</td>
            </tr>
        `).join('');

        // Add click handlers for log details
        document.querySelectorAll('.log-row').forEach(row => {
            row.addEventListener('click', () => {
                const logData = JSON.parse(row.dataset.log);
                this.showLogDetails(logData);
            });
        });
    },

    renderPagination: function (pagination) {
        const container = document.getElementById('pagination-container');
        if (!container) return;

        this.totalPages = pagination.totalPages;

        let paginationHtml = `
            <nav aria-label="Logs pagination">
                <ul class="pagination">
                    <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${this.currentPage - 1}">Previous</a>
                    </li>
        `;

        for (let i = 1; i <= pagination.totalPages; i++) {
            paginationHtml += `
                <li class="page-item ${this.currentPage === i ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        paginationHtml += `
                    <li class="page-item ${this.currentPage === pagination.totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${this.currentPage + 1}">Next</a>
                    </li>
                </ul>
            </nav>
        `;

        container.innerHTML = paginationHtml;

        // Add click handlers for pagination
        container.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (page >= 1 && page <= pagination.totalPages) {
                    this.currentPage = page;
                    this.fetchLogs();
                }
            });
        });
    },

    formatDetails: function (log) {
        if (typeof log.details === 'object' && log.details !== null) {
            if (log.entity === 'order') {
                return this.getOrderIdentifier(log);
            } else if (log.entity === 'user') {
                return log.details.username || 'N/A';
            } else {
                return JSON.stringify(log.details);
            }
        }
        return log.details || 'N/A';
    },

    getActionBadgeClass: function (action) {
        const classes = {
            'create': 'success',
            'update': 'primary',
            'delete': 'danger',
            'status_change': 'warning',
            'remark_add': 'info'
        };
        return classes[action] || 'secondary';
    },

    getOrderIdentifier: function (log) {
        if (log.details.trackingNumber) {
            return `Order #${log.details.trackingNumber}`;
        }
        return 'Order details not available';
    },

    showLogDetails: function (log) {
        // Format the timestamp
        document.getElementById('modalTimestamp').textContent = new Date(log.timestamp).toLocaleString();

        // Set user
        document.getElementById('modalUser').textContent = log.performedBy?.username || 'System';

        // Set action with badge
        const actionBadge = document.createElement('span');
        actionBadge.className = `badge bg-${this.getActionBadgeClass(log.action)}`;
        actionBadge.textContent = log.action;
        document.getElementById('modalAction').innerHTML = '';
        document.getElementById('modalAction').appendChild(actionBadge);

        // Set other fields
        document.getElementById('modalIp').textContent = log.ipAddress || 'N/A';
        document.getElementById('modalEntity').textContent = log.entity;
        document.getElementById('modalEntityId').textContent = log.entityId;

        // Set details with proper formatting
        const detailsElement = document.getElementById('modalDetails');
        if (typeof log.details === 'object' && log.details !== null) {
            detailsElement.textContent = JSON.stringify(log.details, null, 2);
        } else {
            detailsElement.textContent = log.details || 'N/A';
        }

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('logDetailsModal'));
        modal.show();
    }
};

// Initialize the log manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    LogManager.init();
});