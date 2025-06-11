const OrderManager = {
  currentPage: parseInt(sessionStorage.getItem("currentPage")) || 1,
  limit: 50,
  totalPages: 1,
  trackingHistoryModal: null,
  remarksHistoryModal: null,
  verifyReturnModal: null,
  orderType: null, // 'all', 'delivered', or 'returned'

  init: function (orderType) {
    this.orderType = orderType;
    console.log('Initializing OrderManager with type:', orderType);

    // Check if Bootstrap is loaded
    if (typeof bootstrap === 'undefined') {
      console.error('Bootstrap is not loaded. Please ensure Bootstrap JS is included before this script.');
      return;
    }

    // Initialize all modals
    this.initializeModals();

    // First fetch orders, then initialize the button
    this.fetchOrders().then(() => {
      if (this.orderType === 'returned') {
        console.log('Initializing verify returns button after orders fetch');
        this.initializeVerifyReturnButton();
      }
    });
  },

  initializeModals: function () {
    // Initialize tracking history modal
    const trackingHistoryModalEl = document.getElementById('trackingHistoryModal');
    if (trackingHistoryModalEl) {
      this.trackingHistoryModal = new bootstrap.Modal(trackingHistoryModalEl);
      console.log('Tracking history modal initialized');
    } else {
      console.error('Tracking history modal element not found');
    }

    // Initialize remarks history modal
    const remarksHistoryModalEl = document.getElementById('remarksHistoryModal');
    if (remarksHistoryModalEl) {
      this.remarksHistoryModal = new bootstrap.Modal(remarksHistoryModalEl);
      console.log('Remarks history modal initialized');
    } else {
      console.error('Remarks history modal element not found');
    }

    // Initialize verify return modal only if we're on the returned orders page
    if (this.orderType === 'returned') {
      const verifyReturnModalEl = document.getElementById('verifyReturnModal');
      if (verifyReturnModalEl) {
        this.verifyReturnModal = new bootstrap.Modal(verifyReturnModalEl);
        console.log('Verify return modal initialized');
      } else {
        console.error('Verify return modal element not found');
      }
    }
  },

  formatDate: function (dateStr) {
    if (!dateStr) return "N/A";

    let date;

    // Try parsing ISO-like format first
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      date = new Date(dateStr);
    } else if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
      // Handle DD/MM/YYYY format
      const [day, month, year] = dateStr.split(/[\/\s:]/);
      date = new Date(`${year}-${month}-${day}`);
    } else {
      return "Invalid Date";
    }

    const day = date.getDate();
    const monthShort = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();

    const getOrdinal = (n) => {
      if (n > 3 && n < 21) return "th";
      switch (n % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    };

    return `${day}${getOrdinal(day)} ${monthShort} ${year}`;
  },

  getStatusClass: function (status) {
    switch (status.toLowerCase()) {
      case "delivered":
        return "status-delivered";
      case "returned":
        return "status-returned";
      default:
        return "status-pending";
    }
  },

  showTrackingHistory: function (trackingHistory) {
    console.log('Showing tracking history:', trackingHistory);
    const historyArray = Array.isArray(trackingHistory) ? trackingHistory : [];
    if (historyArray.length === 0) {
      console.log('No tracking history to show');
      return;
    }

    const tbody = document.getElementById("trackingHistoryBody");
    if (!tbody) {
      console.error('Tracking history body element not found');
      return;
    }

    tbody.innerHTML = historyArray
      .map(
        (entry) => `
            <tr>
                <td>${entry.date_time || "N/A"}</td>
                <td>${entry.status || "N/A"}</td>
                <td>${entry.status_reason || "No Reason has been provided"}</td>
            </tr>
        `
      )
      .join("");

    if (this.trackingHistoryModal) {
      console.log('Showing tracking history modal');
      this.trackingHistoryModal.show();
    } else {
      console.error("Tracking history modal not initialized");
    }
  },

  showRemarksHistory: function (remarks) {
    console.log('Showing remarks history:', remarks);
    const remarksArray = Array.isArray(remarks) ? remarks : [];
    const tbody = document.getElementById("remarksHistoryBody");

    if (!tbody) {
      console.error('Remarks history body element not found');
      return;
    }

    if (remarksArray.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="text-center text-muted">No remarks found</td>
        </tr>
      `;
    } else {
      tbody.innerHTML = remarksArray
        .map(
          (remark) => `
            <tr>
              <td>${new Date(remark.createdAt).toLocaleString()}</td>
              <td>${remark.createdBy?.username || remark.createdBy || 'System'}</td>
              <td>${remark.content || "No content"}</td>
            </tr>
          `
        )
        .join("");
    }

    if (this.remarksHistoryModal) {
      console.log('Showing remarks history modal');
      this.remarksHistoryModal.show();
    } else {
      console.error("Remarks history modal not initialized");
    }
  },

  renderTable: function ({ columns, rows }) {
    let verifyBtnHtml =
      this.orderType === "returned"
        ? `
            <div class="mb-2 text-end">
                <button type="button" class="btn btn-success" id="verifyReturnsBtn">
                    <i class="fas fa-check-circle"></i> Verify Returns
                </button>
            </div>
        `
        : "";

    let tableHtml = `
        ${verifyBtnHtml}
        <div class="table-container">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>#</th>
                        ${columns.map((col) => `<th>${col}</th>`).join("")}
                        <th class="action-buttons">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.length
        ? rows
          .map((row, index) => {
            return `
                      <tr>
                          <td>${(this.currentPage - 1) * this.limit + index + 1}</td>
                          ${columns
                .map((colKey) => {
                  const value = row[colKey];

                  if (colKey === "Status") {
                    const trackingHistory = row.tracking_history || [];
                    const safeTrackingHistory = JSON.stringify(trackingHistory)
                      .replace(/"/g, '&quot;')
                      .replace(/'/g, '&#39;');
                    return `<td>
                      <span class="status-badge ${this.getStatusClass(value)}" 
                            style="cursor: pointer;" 
                            data-tracking-history='${safeTrackingHistory}'
                            onclick="OrderManager.showTrackingHistoryFromData(this)">
                        ${value}
                      </span>
                  </td>`;
                  }

                  if (colKey === "Remarks") {
                    const remarks = Array.isArray(value) ? value : [];
                    const safeRemarks = JSON.stringify(remarks)
                      .replace(/"/g, '&quot;')
                      .replace(/'/g, '&#39;');
                    const latestRemark = remarks.length > 0 ? remarks[remarks.length - 1]?.content : 'No remarks';
                    return `<td>
              <span class="remarks-badge" 
                    style="cursor: pointer;" 
                    data-remarks='${safeRemarks}'
                    onclick="OrderManager.showRemarksHistoryFromData(this)">
                ${latestRemark}
              </span>
            </td>`;
                  }

                  if (colKey === "Address") {
                    return `<td title="${value}">${value}</td>`;
                  }

                  if (colKey === "Customer & Product Info") {
                    return `
              <td>
                <div class="small mt-1">${row["Customer & Product Info"] || "No Name"}</div>
                <div class="small text-truncate mt-1"><strong>Product Name:</strong> ${row["Product Name"] || "No Product"}</div>
                <div class="small mt-1"><strong>Product Price:</strong> ${row["Product Price"] || "No Price"}</div>
                <div class="small mt-1"><strong>Product Quantity:</strong> ${row["Quantity"] || "No Quantity"}</div>
              </td>
            `;
                  }

                  if (colKey === "Tracking Number") {
                    const courier = (row["Courier Type"] || "").toLowerCase();
                    let trackingUrl = "#";
                    let trackingTitle = value || "No tracking number"; // Default title if value is empty

                    // Set tracking URL based on the courier type
                    if (courier === "trax") {
                      trackingUrl = `https://sonic.pk/tracking?tracking_number=${value}`;
                      trackingTitle = `Track with Trax: ${value}`;
                    } else if (courier === "postex") {
                      trackingUrl = `https://postex.pk/tracking?cn=${value}`;
                      trackingTitle = `Track with Postex: ${value}`;
                    } else if (courier === "daewoo") {
                      trackingUrl = `https://fastex.appsbymoose.com/track/${value}`;
                      trackingTitle = `Track with Daewoo: ${value}`;
                    }

                    return `
                <td>
                    <a href="${trackingUrl}" target="_blank" title="${trackingTitle}">${value}</a>
  <div class="small"><strong>Flyer ID:</strong> ${row["Flyer ID"] || "No Flyer ID"}</div>
    <div class="small mt-1"><strong>Courier Type:</strong> ${row["Courier Type"] || "No Courier"}</div>

                </td>
            `;
                  }

                  return `<td class="text-truncate" title="${value}">${value}</td>`;
                })
                .join("")}
                          <td class="action-buttons">
                              <button 
                                  class="btn btn-sm btn-outline-secondary edit-btn" 
                                  title="Edit" 
                                  data-id="${row.id}"
                                  data-tracking-number="${row['Tracking Number'] || ''}"
                                  data-flyer-id="${row['Flyer ID'] || ''}"
                                  data-courier-type="${row['Courier Type'] || ''}"
                                  data-bs-toggle="modal" 
                                  data-bs-target="#editOrderModal">
                                  <i class="fas fa-edit"></i>
                              </button>
                              <button 
                                  class="btn btn-sm btn-outline-success remarks-btn" 
                                  title="remarks" 
                                  data-id="${row.id}"
                                  data-bs-toggle="modal" 
                                  data-bs-target="#remarksOrderModal">
                                  <i class="fas fa-comment"></i>
                              </button>
                              <button 
                                  class="btn btn-sm btn-outline-danger delete-btn" 
                                  title="Delete" 
                                  data-id="${row.id}">
                                  <i class="fas fa-trash"></i>
                              </button>
                          </td>
                      </tr>
                  `;
          })
          .join("")
        : `<tr><td colspan="${columns.length + 2}" class="text-center text-muted">No data found.</td></tr>`
      }
                </tbody>
            </table>
        </div>
    `;

    document.getElementById("orders-table-container").innerHTML = tableHtml;

    // Initialize event handlers after table is rendered
    this.initializeEventHandlers();
  },

  initializeEventHandlers: function () {
    // Initialize verify returns button if needed
    if (this.orderType === "returned") {
      this.initializeVerifyReturnButton();
    }

    // Attach delete listeners
    this.attachDeleteListeners();
  },

  attachDeleteListeners: function () {
    const container = document.getElementById("orders-table-container");
    if (!container) return;

    // Remove any existing listeners
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);

    // Add new listener
    newContainer.addEventListener("click", async (e) => {
      const target = e.target.closest(".delete-btn");
      if (!target || target.disabled) return;

      const orderId = target.dataset.id;
      if (!orderId) return;

      if (confirm("Are you sure you want to delete this order?")) {
        await this.deleteOrder(orderId);
      }
    });
  },

  renderPagination: function () {
    let html = `
        <nav aria-label="Page navigation">
            <ul class="pagination">
                <li class="page-item ${this.currentPage === 1 ? "disabled" : ""
      }">
                    <a class="page-link" href="#" data-page="${this.currentPage - 1
      }">Previous</a>
                </li>
        `;

    for (let i = 1; i <= this.totalPages; i++) {
      html += `
                <li class="page-item ${i === this.currentPage ? "active" : ""}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
    }

    html += `
                <li class="page-item ${this.currentPage === this.totalPages ? "disabled" : ""
      }">
                    <a class="page-link" href="#" data-page="${this.currentPage + 1
      }">Next</a>
                </li>
            </ul>
        </nav>
        `;
    document.getElementById("pagination-container").innerHTML = html;

    // Rebind pagination click handlers
    document.querySelectorAll(".page-link").forEach((link) => {
      link.addEventListener("click", async (e) => {
        e.preventDefault();
        const page = parseInt(e.currentTarget.dataset.page);
        if (page >= 1 && page <= this.totalPages) {
          this.currentPage = page;
          sessionStorage.setItem("currentPage", this.currentPage);
          await this.fetchOrders(); // Wait for render
          window.scrollTo({ top: 0, behavior: "smooth" }); // Scroll after render
        }
      });
    });
  },

  fetchOrders: async function () {
    const endpoint =
      this.orderType === "all"
        ? "/api/orders"
        : this.orderType === "delivered"
          ? "/api/orders/delivered"
          : "/api/orders/returned";

    try {
      showLoader();
      const response = await fetchWithLoader(`${endpoint}?page=${this.currentPage}&limit=${this.limit}`);
      const { trackingData, pagination } = response;

      if (!trackingData || !pagination) {
        console.error("Invalid response format:", response);
        return;
      }

      this.totalPages = pagination.totalPages;

      const columns = [
        "Tracking Number",
        "Status",
        "Remarks",
        "Date",
        "Address",
        "Customer & Product Info",
        "Last Tracking Update",
      ];

      const rows = trackingData.map((order) => {
        const trackingHistory = order.rawJson?.details?.tracking_history || [];

        return {
          id: order._id,
          "Tracking Number": order.trackingNumber,
          Status: order.status,
          'Remarks': order.remarks,
          "Flyer ID": order.flyerId,
          "Courier Type": order.courierType,
          Address: order.productInfo?.Address || "N/A",
          "Customer & Product Info": order.productInfo?.CustomerName || "N/A",
          "Product Name": order.productInfo?.OrderDetails?.ProductName || "N/A",
          Date: this.formatDate(order.productInfo?.date),
          Quantity: order.productInfo?.OrderDetails?.Quantity || "N/A",
          "Product Price": order.productInfo?.OrderDetails?.Price || "N/A",
          "Last Tracking Update": order.last_tracking_update
            ? new Date(order.last_tracking_update).toLocaleString()
            : "N/A",
          tracking_history: trackingHistory,
        };
      });

      this.renderTable({ columns, rows });
      this.renderPagination();
    } catch (error) {
      console.error("Error fetching orders:", error);
      document.getElementById("orders-table-container").innerHTML = `
        <div class="alert alert-danger" role="alert">
          Error fetching orders. Please try again later.
        </div>
      `;
    } finally {
      hideLoader();
    }
  },

  updateOrderStatus: async function (orderId, status, reason) {
    try {
      showLoader();
      const response = await fetchWithLoader(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, reason }),
      });

      if (response.success) {
        this.fetchOrders();
      } else {
        console.error('Failed to update order status:', response.message);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    } finally {
      hideLoader();
    }
  },

  addRemark: async function (orderId, remark) {
    try {
      showLoader();
      const response = await fetchWithLoader(`/api/orders/${orderId}/remarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ remark }),
      });

      if (response.success) {
        this.fetchOrders();
      } else {
        console.error('Failed to add remark:', response.message);
      }
    } catch (error) {
      console.error('Error adding remark:', error);
    } finally {
      hideLoader();
    }
  },

  deleteOrder: async function (orderId) {
    if (!orderId) return;

    // Disable all delete buttons to prevent multiple clicks
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(btn => btn.disabled = true);

    try {
      const response = await axios.delete(`/api/orders/${orderId}`);

      if (response.data.success) {
        // Show success animation
        const { showSuccessAnimation } = await import('./modules/successAnimation.js');
        showSuccessAnimation();

        // Remove the deleted row directly
        const row = document.querySelector(`[data-id="${orderId}"]`).closest('tr');
        if (row) {
          row.remove();
        }
      } else {
        alert('Failed to delete order: ' + response.data.message);
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // If order doesn't exist, just remove the row
        const row = document.querySelector(`[data-id="${orderId}"]`).closest('tr');
        if (row) {
          row.remove();
        }
      } else {
        console.error("Error deleting order:", error);
        alert("An error occurred while deleting the order.");
      }
    } finally {
      // Re-enable all delete buttons
      deleteButtons.forEach(btn => btn.disabled = false);
    }
  },

  initializeVerifyReturnButton: function () {
    console.log('Initializing verify returns button...');
    const verifyReturnsBtn = document.getElementById('verifyReturnsBtn');
    if (verifyReturnsBtn) {
      console.log('Verify returns button found, attaching click handler');

      // Remove any existing click handlers
      const newBtn = verifyReturnsBtn.cloneNode(true);
      verifyReturnsBtn.parentNode.replaceChild(newBtn, verifyReturnsBtn);

      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Verify returns button clicked');

        if (this.verifyReturnModal) {
          this.verifyReturnModal.show();
        } else {
          console.error("Verify return modal not initialized");
        }
      });

      console.log('Click handler attached successfully');
    } else {
      console.error('Verify returns button not found');
    }
  },

  showTrackingHistoryFromData: function (element) {
    try {
      const trackingHistoryStr = element.dataset.trackingHistory;
      if (!trackingHistoryStr) {
        console.error('No tracking history data found');
        return;
      }
      const trackingHistory = JSON.parse(trackingHistoryStr);
      this.showTrackingHistory(trackingHistory);
    } catch (error) {
      console.error('Error parsing tracking history:', error);
      console.log('Raw tracking history data:', element.dataset.trackingHistory);
    }
  },

  showRemarksHistoryFromData: function (element) {
    try {
      const remarksStr = element.dataset.remarks;
      if (!remarksStr) {
        console.error('No remarks data found');
        return;
      }
      const remarks = JSON.parse(remarksStr);
      this.showRemarksHistory(remarks);
    } catch (error) {
      console.error('Error parsing remarks:', error);
      console.log('Raw remarks data:', element.dataset.remarks);
    }
  },
};



document.addEventListener('DOMContentLoaded', async function () {
  // Import the success animation
  const { showSuccessAnimation } = await import('./modules/successAnimation.js');

  let orderId = null;

  // Fill form when edit button is clicked
  document.addEventListener('click', function (e) {
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
      orderId = editBtn.getAttribute('data-id');
      const trackingNumber = editBtn.getAttribute('data-tracking-number') || '';
      const flyerId = editBtn.getAttribute('data-flyer-id') || '';
      const courierType = editBtn.getAttribute('data-courier-type') || '';

      document.getElementById('editTrackingNumber').value = trackingNumber;
      document.getElementById('editFlyerId').value = flyerId;
      document.getElementById('editCourierType').value = courierType;
    }
  });

  // Submit updated tracking info
  const form = document.getElementById('editOrderForm');
  const editSubmitBtn = document.getElementById('editOrderSubmitBtn');

  editSubmitBtn.addEventListener('click', async function (e) {
    e.preventDefault();

    const trackingNumber = document.getElementById('editTrackingNumber').value;
    const flyerId = document.getElementById('editFlyerId').value;
    const courierType = document.getElementById('editCourierType').value;

    if (!trackingNumber || !flyerId || !courierType) {
      alert('Please fill in all fields.');
      return;
    }

    editSubmitBtn.disabled = true;

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ trackingNumber, flyerId, courierType })
      });

      const result = await response.json();

      if (response.ok) {
        // Show success animation
        showSuccessAnimation();

        // Close the edit modal
        const editModal = bootstrap.Modal.getInstance(document.getElementById('editOrderModal'));
        editModal.hide();

        // Clear the form
        form.reset();

        // Update the row directly
        const row = document.querySelector(`[data-id="${orderId}"]`).closest('tr');
        if (row) {
          const trackingCell = row.querySelector('td:nth-child(1)');
          if (trackingCell) {
            trackingCell.innerHTML = `
              <a href="${getTrackingUrl(courierType, trackingNumber)}" target="_blank" title="Track with ${courierType}: ${trackingNumber}">${trackingNumber}</a>
              <div class="small"><strong>Flyer ID:</strong> ${flyerId}</div>
              <div class="small mt-1"><strong>Courier Type:</strong> ${courierType}</div>
            `;
          }
        }
      } else {
        alert('Failed to update: ' + result.error);
      }
    } catch (error) {
      console.error('Request failed:', error);
      alert('An error occurred while updating.');
    } finally {
      editSubmitBtn.disabled = false;
    }
  });

  // Helper function to get tracking URL
  function getTrackingUrl(courierType, trackingNumber) {
    const courier = courierType.toLowerCase();
    if (courier === "trax") {
      return `https://sonic.pk/tracking?tracking_number=${trackingNumber}`;
    } else if (courier === "postex") {
      return `https://postex.pk/tracking?cn=${trackingNumber}`;
    } else if (courier === "daewoo") {
      return `https://fastex.appsbymoose.com/track/${trackingNumber}`;
    }
    return "#";
  }

  // When "remark" button is clicked
  document.addEventListener('click', function (e) {
    const remarkBtn = e.target.closest('.remarks-btn');
    if (remarkBtn) {
      const orderId = remarkBtn.getAttribute('data-id');
      const remarksForm = document.getElementById('remarksOrderForm');
      if (remarksForm) {
        remarksForm.setAttribute('data-order-id', orderId);
      }
    }
  });

  const remarksForm = document.getElementById('remarksOrderForm');
  const remarksSubmitBtn = document.getElementById('remarksOrderSubmitBtn');

  if (!remarksForm || !remarksSubmitBtn) return;

  remarksSubmitBtn.addEventListener('click', async function (e) {
    e.preventDefault();

    const content = document.getElementById('remarkText').value.trim();
    const orderId = remarksForm.getAttribute('data-order-id');

    if (!orderId) {
      alert('No order selected for remark.');
      return;
    }

    if (!content) {
      alert('Please enter a remark.');
      return;
    }

    remarksSubmitBtn.disabled = true;

    try {
      const response = await fetch(`/api/orders/remarks/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      const result = await response.json();

      if (response.ok) {
        // Show success animation
        showSuccessAnimation();

        // Close the remarks modal
        const remarksModal = bootstrap.Modal.getInstance(document.getElementById('remarksOrderModal'));
        remarksModal.hide();

        // Clear the form
        document.getElementById('remarkText').value = '';

        // Update the remarks cell directly
        const row = document.querySelector(`[data-id="${orderId}"]`).closest('tr');
        if (row) {
          const remarksCell = row.querySelector('.remarks-badge');
          if (remarksCell) {
            remarksCell.textContent = content;
          }
        }
      } else {
        alert('Failed to add remark: ' + result.message);
      }
    } catch (error) {
      console.error('Error while submitting remark:', error);
      alert('An error occurred. Please try again.');
    } finally {
      remarksSubmitBtn.disabled = false;
    }
  });
});










