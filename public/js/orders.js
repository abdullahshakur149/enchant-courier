// Shared order handling functionality
const OrderManager = {
    currentPage: parseInt(sessionStorage.getItem('currentPage')) || 1,
    limit: 50,
    totalPages: 1,
    trackingHistoryModal: null,
    orderType: null, // 'all', 'delivered', or 'returned'

    init: function(orderType) {
        this.orderType = orderType;
        this.trackingHistoryModal = new bootstrap.Modal(document.getElementById('trackingHistoryModal'));
        this.fetchOrders();
    },

    getStatusClass: function(status) {
        switch(status.toLowerCase()) {
            case 'delivered':
                return 'status-delivered';
            case 'returned':
                return 'status-returned';
            default:
                return 'status-pending';
        }
    },

    showTrackingHistory: function(trackingHistory) {
        // console.log('Raw Tracking History:', trackingHistory);
        
        const historyArray = Array.isArray(trackingHistory) ? trackingHistory : [];
        // console.log('Processed Tracking History:', historyArray);

        if (historyArray.length === 0) {
            // console.log('No tracking history available');
            return;
        }

        const tbody = document.getElementById('trackingHistoryBody');
        tbody.innerHTML = historyArray.map(entry => {
            // console.log('Processing entry:', entry);
            
            return `
                <tr>
                    <td>${entry.date_time || 'N/A'}</td>
                    <td>${entry.status || 'N/A'}</td>
                    <td>${entry.status_reason || 'N/A'}</td>
                </tr>
            `;
        }).join('');
        
        if (this.trackingHistoryModal) {
            this.trackingHistoryModal.show();
        } else {
            console.error('Modal not initialized');
        }
    },

    renderTable: function({ columns, rows }) {
        let html = `
        <div class="table-container">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>#</th>
                        ${columns.map(col => `<th>${col}</th>`).join('')}
                        <th class="action-buttons">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.length ? rows.map((row, index) => {
                        // console.log('Row data with tracking history:', row);
                        return `
                        <tr>
                            <td>${(this.currentPage - 1) * this.limit + index + 1}</td>
                            ${columns.map(colKey => {
                                const value = row[colKey];
                                if (colKey === 'Status') {
                                    const trackingHistory = row.tracking_history || [];
                                    // console.log('Setting tracking history for status badge:', trackingHistory);
                                    return `<td><span class="status-badge ${this.getStatusClass(value)}" style="cursor: pointer;" data-tracking-history='${JSON.stringify(trackingHistory)}'>${value}</span></td>`;
                                }
                                return `<td class="text-truncate" title="${value}">${value}</td>`;
                            }).join('')}
                            <td class="action-buttons">
                                <a href="/orders/${row.id}" class="btn btn-sm btn-outline-primary" title="View"><i class="fas fa-eye"></i></a>
                                <a href="/orders/${row.id}/edit" class="btn btn-sm btn-outline-secondary" title="Edit"><i class="fas fa-edit"></i></a>
                                ${this.orderType === 'returned' ? `
                                    <button class="btn btn-sm btn-outline-success verify-return-btn" title="Verify Return" 
                                            data-tracking="${row['Tracking Number']}" 
                                            data-flyer="${row['Flyer ID']}">
                                        <i class="fas fa-check"></i>
                                    </button>
                                ` : ''}
                                <button class="btn btn-sm btn-outline-danger delete-btn" title="Delete" data-id="${row.id}"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `}).join('') : `<tr><td colspan="${columns.length + 2}" class="text-center text-muted">No data found.</td></tr>`}
                </tbody>
            </table>
        </div>
        `;
        document.getElementById('orders-table-container').innerHTML = html;

        // Add click event listeners to status badges
        document.querySelectorAll('.status-badge').forEach(badge => {
            badge.addEventListener('click', (e) => {
                try {
                    const trackingHistory = JSON.parse(e.currentTarget.dataset.trackingHistory);
                    // console.log('Clicked status badge with tracking history:', trackingHistory);
                    this.showTrackingHistory(trackingHistory);
                } catch (error) {
                    console.error('Error parsing tracking history:', error);
                    console.error('Raw tracking history data:', e.currentTarget.dataset.trackingHistory);
                }
            });
        });

        // Add click event listeners to verify return buttons
        if (this.orderType === 'returned') {
            document.querySelectorAll('.verify-return-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const verifyReturnModal = new bootstrap.Modal(document.getElementById('verifyReturnModal'));
                    verifyReturnModal.show();
                });
            });
        }

        // Attach delete listeners
        this.attachDeleteListeners();
    },

    attachDeleteListeners: function() {
        document.getElementById('orders-table-container').addEventListener('click', (e) => {
            const target = e.target.closest('.delete-btn');
            if (target) {
                const orderId = target.dataset.id;
                this.deleteOrder(orderId);
            }
        });
    },

    renderPagination: function() {
        let html = `
        <nav aria-label="Page navigation">
            <ul class="pagination">
                <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${this.currentPage - 1}">Previous</a>
                </li>
        `;

        for (let i = 1; i <= this.totalPages; i++) {
            html += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        html += `
                <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${this.currentPage + 1}">Next</a>
                </li>
            </ul>
        </nav>
        `;
        document.getElementById('pagination-container').innerHTML = html;

        const oldLinks = document.querySelectorAll('.page-link');
        oldLinks.forEach(link => {
            link.replaceWith(link.cloneNode(true));
        });

        document.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.currentTarget.dataset.page);
                // console.log('Clicked page:', page);
                if (page >= 1 && page <= this.totalPages) {
                    this.currentPage = page;
                    sessionStorage.setItem('currentPage', this.currentPage);
                    console.log('Setting currentPage to:', this.currentPage);
                    this.fetchOrders();
                }
            });
        });
    },

    fetchOrders: function() {
        // console.log('Fetching orders for page:', this.currentPage);
        const endpoint = this.orderType === 'all' ? '/api/orders' : 
                        this.orderType === 'delivered' ? '/api/orders/delivered' : 
                        '/api/orders/returned';

        // console.log('Using endpoint:', endpoint);
        axios.get(`${endpoint}?page=${this.currentPage}&limit=${this.limit}`)
            .then(res => {
                // console.log('Full API Response:', res.data);
                const { trackingData, pagination } = res.data;
                // console.log('Tracking Data:', trackingData);
                
                if (!trackingData || !pagination) {
                    console.error('Invalid response format:', res.data);
                    return;
                }

                this.totalPages = pagination.totalPages;

                const columns = [
                    'Tracking Number',
                    'Flyer ID',
                    'Courier Type',
                    'Customer Name',
                    'Product Name',
                    'Quantity',
                    'Status',
                    'Last Tracking Update'
                ];
                const rows = trackingData.map(order => {
                    // console.log('Raw Order Data:', order);
                    const trackingHistory = order.rawJson?.details?.tracking_history || [];
                    // console.log('Order Tracking History:', trackingHistory);
                    return {
                        id: order._id,
                        'Tracking Number': order.trackingNumber,
                        'Flyer ID': order.flyerId,
                        'Courier Type': order.courierType,
                        'Customer Name': order.productInfo?.CustomerName || 'N/A',
                        'Product Name': order.productInfo?.OrderDetails?.ProductName || 'N/A',
                        'Quantity': order.productInfo?.OrderDetails?.Quantity || 'N/A',
                        'Status': order.status,
                        'Last Tracking Update': order.last_tracking_update ? new Date(order.last_tracking_update).toLocaleString() : 'N/A',
                        tracking_history: trackingHistory
                    };
                });

                this.renderTable({ columns, rows });
                this.renderPagination();
            })
            .catch(error => {
                console.error('Error fetching orders:', error);
                document.getElementById('orders-table-container').innerHTML = `
                    <div class="alert alert-danger" role="alert">
                        Error fetching orders. Please try again later.
                    </div>
                `;
            });
    },

    deleteOrder: function(orderId) {
        if (confirm('Are you sure you want to delete this order?')) {
            console.log('Deleting order with ID:', orderId);
            axios.delete(`/api/orders/${orderId}`)
                .then(response => {
                    console.log('Order deleted successfully:', response);
                    this.fetchOrders();
                })
                .catch(error => {
                    console.error('Error deleting order:', error);
                    alert('An error occurred while deleting the order.');
                });
        }
    }
    
};
