
const OrderManager = {
  currentPage: parseInt(sessionStorage.getItem("currentPage")) || 1,
  limit: 50,
  totalPages: 1,
  trackingHistoryModal: null,
  orderType: null, // 'all', 'delivered', or 'returned'

  init: function (orderType) {
    this.orderType = orderType;
    this.trackingHistoryModal = new bootstrap.Modal(
      document.getElementById("trackingHistoryModal")
    );
    this.fetchOrders();
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
    const historyArray = Array.isArray(trackingHistory) ? trackingHistory : [];
    if (historyArray.length === 0) return;

    const tbody = document.getElementById("trackingHistoryBody");
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

    this.trackingHistoryModal
      ? this.trackingHistoryModal.show()
      : console.error("Modal not initialized");
  },

  renderTable: function ({ columns, rows }) {
    let verifyBtnHtml =
      this.orderType === "returned"
        ? `
            <div class="mb-2 text-end">
                <button class="btn btn-success" id="verifyReturnsBtn">
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
          .map(
            (row, index) => `
                        <tr>
                            <td>${(this.currentPage - 1) * this.limit + index + 1
              }</td>
                            ${columns
                .map((colKey) => {
                  const value = row[colKey];
                  if (colKey === "Status") {
                    const trackingHistory =
                      row.tracking_history || [];
                    return `<td><span class="status-badge ${this.getStatusClass(
                      value
                    )}" style="cursor: pointer;" data-tracking-history='${JSON.stringify(
                      trackingHistory
                    )}'>${value}</span></td>`;
                  }
                  if (colKey === "Remarks") {
                    return `<td>
   <button 
      class="btn btn-sm btn-outline-secondary view-remarks-btn" 
      title="View Remarks" 
      data-remarks="${row.remarks || 'No remarks available.'}"  
      data-id="${row.id}"
      data-bs-toggle="modal" 
      data-bs-target="#remarksHistoryModel">
        <i class="fas fa-comment"></i> View Remarks
    </button>
</td>`;

                  }

                  if (colKey === "Address") {
                    return `<td title="${value}">${value}</td>`;
                  }
                  if (colKey === "Tracking Number") {
                    const courier = (
                      row["Courier Type"] || ""
                    ).toLowerCase();
                    let trackingUrl = "#";

                    if (courier === "trax") {
                      trackingUrl = `https://sonic.pk/tracking?tracking_number=${value}`;
                    } else if (courier === "postex") {
                      trackingUrl = `https://postex.pk/tracking?cn=${value}`;
                    } else if (courier === "daewoo") {
                      trackingUrl = `https://fastex.appsbymoose.com/track/${value}`;
                    }

                    return `<td><a href="${trackingUrl}" target="_blank">${value}</a></td>`;
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
    data-bs-target="#editOrderModal"
>
    <i class="fas fa-edit"></i>
</button>

<button 
    class="btn btn-sm btn-outline-success remarks-btn" 
    title="remarks" 
    data-id="${row.id}"
    data-bs-toggle="modal" 
    data-bs-target="#remarksOrderModal"
>
    <i class="fas fa-comment"></i>
</button>



                                <button class="btn btn-sm btn-outline-danger delete-btn" title="Delete" data-id="${row.id
              }"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `
          )
          .join("")
        : `<tr><td colspan="${columns.length + 2
        }" class="text-center text-muted">No data found.</td></tr>`
      }
                </tbody>
            </table>
        </div>
        `;

    document.getElementById("orders-table-container").innerHTML = tableHtml;
    document.querySelectorAll(".view-remarks-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const remarks = e.currentTarget.getAttribute("data-remarks");
        document.getElementById("remarksModalBody").innerText = remarks || "No remarks available.";
      });
    });



    // Status badge click handler
    document.querySelectorAll(".status-badge").forEach((badge) => {
      badge.addEventListener("click", (e) => {
        try {
          const trackingHistory = JSON.parse(
            e.currentTarget.dataset.trackingHistory
          );
          this.showTrackingHistory(trackingHistory);
        } catch (error) {
          console.error("Error parsing tracking history:", error);
        }
      });
    });

    // Verify Returns button event
    if (this.orderType === "returned") {
      const verifyReturnsBtn = document.getElementById("verifyReturnsBtn");
      if (verifyReturnsBtn) {
        verifyReturnsBtn.addEventListener("click", () => {
          const verifyReturnModal = new bootstrap.Modal(
            document.getElementById("verifyReturnModal")
          );
          verifyReturnModal.show();
        });
      }
    }

    // Attach delete listeners
    this.attachDeleteListeners();
  },

  attachDeleteListeners: function () {
    document
      .getElementById("orders-table-container")
      .addEventListener("click", (e) => {
        const target = e.target.closest(".delete-btn");
        if (target) {
          const orderId = target.dataset.id;
          this.deleteOrder(orderId);
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
      const res = await axios.get(
        `${endpoint}?page=${this.currentPage}&limit=${this.limit}`
      );
      const { trackingData, pagination } = res.data;

      if (!trackingData || !pagination) {
        console.error("Invalid response format:", res.data);
        return;
      }

      this.totalPages = pagination.totalPages;

      const columns = [
        "Tracking Number",
        "Status",
        "Remarks",  // Add Remarks here
        "Date",
        "Address",
        "Customer Name",
        "Product Name",
        "Courier Type",
        "Product Price",
        "Flyer ID",
        "Quantity",
        "Last Tracking Update",
      ];

      const rows = trackingData.map((order) => {
        const trackingHistory = order.rawJson?.details?.tracking_history || [];


        return {
          id: order._id,
          "Tracking Number": order.trackingNumber,
          Status: order.status,
          "Flyer ID": order.flyerId,
          "Courier Type": order.courierType,
          Address: order.productInfo?.Address || "N/A",
          "Customer Name": order.productInfo?.CustomerName || "N/A",
          "Product Name": order.productInfo?.OrderDetails?.ProductName || "N/A",
          Date: this.formatDate(order.productInfo?.date),
          Quantity: order.productInfo?.OrderDetails?.Quantity || "N/A",
          "Product Price": order.invoicePayment || "N/A",
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
    }
  },

  deleteOrder: function (orderId) {
    if (confirm("Are you sure you want to delete this order?")) {
      axios
        .delete(`/api/orders/${orderId}`)
        .then(() => {
          this.fetchOrders();
        })
        .catch((error) => {
          console.error("Error deleting order:", error);
          alert("An error occurred while deleting the order.");
        });
    }
  },
};



document.addEventListener('DOMContentLoaded', function () {

  let orderId = null;

  // Fill form when edit button is clicked
  document.addEventListener('click', function (e) {
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
      orderId = editBtn.getAttribute('data-id');
      console.log('Order ID:', orderId);

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
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const trackingNumber = document.getElementById('editTrackingNumber').value;
    const flyerId = document.getElementById('editFlyerId').value;
    const courierType = document.getElementById('editCourierType').value;

    if (!trackingNumber || !flyerId || !courierType) {
      alert('Please fill in all fields.');
      return;
    }

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
        alert('Order updated successfully!');
        window.location.reload();
      } else {
        alert('Failed to update: ' + result.error);
      }
    } catch (error) {
      console.error('Request failed:', error);
      alert('An error occurred while updating.');
    }
  });
});


document.addEventListener('DOMContentLoaded', function () {
  // When "remark" button is clicked
  document.addEventListener('click', function (e) {
    const remarkBtn = e.target.closest('.remarks-btn');
    if (remarkBtn) {
      const orderId = remarkBtn.getAttribute('data-id');
      // console.log('Selected Order ID for remark:', orderId);

      // Save orderId globally or on the form itself (as a data attribute)
      const remarksForm = document.getElementById('remarksOrderForm');
      if (remarksForm) {
        remarksForm.setAttribute('data-order-id', orderId);  // Store orderId directly in the form
      }
    }
  });

  const remarksForm = document.getElementById('remarksOrderForm');
  if (!remarksForm) return;

  remarksForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const content = document.getElementById('remarkText').value.trim();
    const orderId = remarksForm.getAttribute('data-order-id');  // Retrieve the orderId from the form's data attribute
    const submitBtn = remarksForm.querySelector('button[type="submit"]');

    if (!orderId) {
      alert('No order selected for remark.');
      return;
    }

    if (!content) {
      alert('Please enter a remark.');
      return;
    }

    submitBtn.disabled = true;

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
        alert('Remark added successfully!');
        // window.location.reload(); // Reload the page to see the changes
      } else {
        alert('Failed to add remark: ' + result.message);
      }
    } catch (error) {
      console.error('Error while submitting remark:', error);
      alert('An error occurred. Please try again.');
    } finally {
      submitBtn.disabled = false;
    }
  });
});










