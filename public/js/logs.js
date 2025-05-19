const LogManager = {
    currentPage: 1,
    limit: 50,
    totalPages: 1,

    init: function() {
        // Only initialize if we're on the logs page
        if (!document.querySelector('.logs-container')) {
            return;
        }

        this.fetchLogs();
        this.attachEventListeners();
    },

    fetchLogs: async function() {
        try {
            // Get filter values with null checks
            const startDate = document.getElementById('startDate')?.value || '';
            const endDate = document.getElementById('endDate')?.value || '';
            const actionType = document.getElementById('actionType')?.value || '';
            const userId = document.getElementById('userId')?.value || '';

            const response = await fetch(`/api/logs?startDate=${startDate}&endDate=${endDate}&actionType=${actionType}&userId=${userId}`);
            const data = await response.json();
            
            this.updateLogsTable(data.logs);
        } catch (error) {
            console.error('Error fetching logs:', error);
            // Show error message to user
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger';
            errorDiv.textContent = 'Failed to fetch logs. Please try again.';
            document.querySelector('.logs-container')?.prepend(errorDiv);
        }
    },

    updateLogsTable: function(logs) {
        const tbody = document.querySelector('.logs-table tbody');
        if (!tbody) return;

        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.userId || 'N/A'}</td>
                <td>${log.action}</td>
                <td>${log.details || 'N/A'}</td>
                <td>${log.ipAddress || 'N/A'}</td>
            </tr>
        `).join('');
    },

    renderPagination: function(pagination) {
        const paginationContainer = document.getElementById('pagination');
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

    getActionBadgeClass: function(action) {
        const classes = {
            'create': 'success',
            'update': 'primary',
            'delete': 'danger',
            'status_change': 'warning',
            'remark_add': 'info'
        };
        return classes[action] || 'secondary';
    },

    showLogDetails: function(log) {
        const modal = new bootstrap.Modal(document.getElementById('logDetailsModal'));
        const detailsElement = document.getElementById('logDetails');
        detailsElement.textContent = JSON.stringify(log, null, 2);
        modal.show();
    },

    attachEventListeners: function() {
        // Get all filter elements
        const filterElements = {
            startDate: document.getElementById('startDate'),
            endDate: document.getElementById('endDate'),
            actionType: document.getElementById('actionType'),
            userId: document.getElementById('userId'),
            filterBtn: document.getElementById('filterBtn'),
            resetBtn: document.getElementById('resetBtn')
        };

        // Add event listeners only if elements exist
        if (filterElements.filterBtn) {
            filterElements.filterBtn.addEventListener('click', () => this.fetchLogs());
        }

        if (filterElements.resetBtn) {
            filterElements.resetBtn.addEventListener('click', () => {
                // Reset all filter inputs if they exist
                Object.values(filterElements).forEach(element => {
                    if (element && element.tagName === 'INPUT') {
                        element.value = '';
                    } else if (element && element.tagName === 'SELECT') {
                        element.selectedIndex = 0;
                    }
                });
                this.fetchLogs();
            });
        }

        // Add change listeners to filter inputs
        Object.entries(filterElements).forEach(([key, element]) => {
            if (element && (element.tagName === 'INPUT' || element.tagName === 'SELECT')) {
                element.addEventListener('change', () => this.fetchLogs());
            }
        });
    }
};

// Initialize only when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    LogManager.init();
});