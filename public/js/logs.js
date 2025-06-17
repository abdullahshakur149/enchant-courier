const LogManager = {
    currentPage: 1,
    limit: 50,
    totalPages: 1,

    init: function () {
        // Only initialize if we're on the logs page
        if (!document.querySelector('.logs-table')) {
            return;
        }

        this.fetchLogs();
        this.attachEventListeners();
    },

    fetchLogs: async function () {
        try {
            // Get filter values with null checks
            const startDate = document.getElementById('startDate')?.value || '';
            const endDate = document.getElementById('endDate')?.value || '';
            const actionType = document.getElementById('actionFilter')?.value || '';
            const entityType = document.getElementById('entityFilter')?.value || '';

            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: this.limit,
                ...(startDate && { startDate }),
                ...(endDate && { endDate }),
                ...(actionType && { actionType }),
                ...(entityType && { entityType })
            });

            const response = await fetch(`/api/logs?${queryParams}`);
            const data = await response.json();

            if (data.logs) {
                this.updateLogsTable(data.logs);
                if (data.pagination) {
                    this.renderPagination(data.pagination);
                }
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
            // Show error message to user
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger';
            errorDiv.textContent = 'Failed to fetch logs. Please try again.';
            document.querySelector('.card-body')?.prepend(errorDiv);
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
    },

    formatDetails: function (log) {
        if (typeof log.details === 'object' && log.details !== null) {
            if (log.entity === 'order') {
                return getOrderIdentifier(log);
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

    renderPagination: function (pagination) {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;

        this.totalPages = pagination.totalPages;

        let paginationHtml = `
            <nav aria-label="Logs pagination">
                <ul class="pagination justify-content-center">
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

        paginationContainer.innerHTML = paginationHtml;

        // Attach click handlers for pagination
        paginationContainer.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this.fetchLogs();
                }
            });
        });
    },

    showLogDetails: function (log) {
        const modal = new bootstrap.Modal(document.getElementById('logDetailsModal'));
        const detailsElement = document.getElementById('logDetails');
        detailsElement.textContent = JSON.stringify(log, null, 2);
        modal.show();
    },

    attachEventListeners: function () {
        // Get all filter elements
        const filterElements = {
            startDate: document.getElementById('startDate'),
            endDate: document.getElementById('endDate'),
            actionFilter: document.getElementById('actionFilter'),
            entityFilter: document.getElementById('entityFilter'),
            filterBtn: document.getElementById('filterBtn')
        };

        // Add event listeners only if elements exist
        if (filterElements.filterBtn) {
            filterElements.filterBtn.addEventListener('click', () => {
                this.currentPage = 1; // Reset to first page when filtering
                this.fetchLogs();
            });
        }

        // Add change listeners to filter inputs
        Object.entries(filterElements).forEach(([key, element]) => {
            if (element && (element.tagName === 'INPUT' || element.tagName === 'SELECT')) {
                element.addEventListener('change', () => {
                    this.currentPage = 1; // Reset to first page when filter changes
                    this.fetchLogs();
                });
            }
        });
    }
};

// Initialize only when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    LogManager.init();
});

function getOrderIdentifier(log) {
    if (log.details && log.details.trackingNumber) {
        return log.details.trackingNumber;
    }
    return 'N/A';
}