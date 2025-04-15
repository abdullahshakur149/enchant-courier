/**
 * Helper function to select elements
 */
function select(el) {
  return document.querySelector(el);
}

/**
 * Helper function to add event listeners
 */
function on(event, el, handler) {
  if (el) {
    el.addEventListener(event, handler);
  }
}

/**
 * Sidebar toggle
 */
function toggleSidebar() {
  // Check if element with class 'toggle-sidebar-btn' exists
  var toggleSidebarBtn = document.querySelector('.toggle-sidebar-btn');

  // If the element exists, add click event listener
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', function (e) {
      // Toggle the 'toggle-sidebar' class on the body element
      document.body.classList.toggle('toggle-sidebar');
    });
  }
}

// Call the function to activate the sidebar toggle functionality
toggleSidebar();

/**
 * Search bar toggle
 */
if (select('.search-bar-toggle')) {
  on('click', '.search-bar-toggle', function (e) {
    select('.search-bar').classList.toggle('search-bar-show')
  })
}


function openModal(imageSrc) {
  var modal = document.getElementById('myModal');
  var modalImg = document.getElementById('modal-img');
  modal.style.display = 'block';
  modalImg.src = imageSrc;
}
function closeModal() {
  document.getElementById('myModal').style.display = 'none';
}

function goBack() {
  window.history.back();
}

document.addEventListener('DOMContentLoaded', function() {
    // Handle Add User Form Submission
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                const formData = new FormData(this);
                const response = await fetch('/dashboard/settings/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(Object.fromEntries(formData)),
                });

                const data = await response.json();
                
                if (response.ok) {
                    showAlert('success', 'User added successfully');
                    location.reload();
                } else {
                    showAlert('danger', data.message || 'Error adding user');
                }
            } catch (error) {
                showAlert('danger', 'An error occurred while adding the user');
            }
        });
    }

    // Handle Delete User
    document.querySelectorAll('.delete-user').forEach(button => {
        button.addEventListener('click', async function() {
            const userId = this.dataset.userId;
            
            if (!confirm('Are you sure you want to delete this user?')) {
                return;
            }

            try {
                const response = await fetch(`/dashboard/settings/users/${userId}`, {
                    method: 'DELETE',
                });

                const data = await response.json();
                
                if (response.ok) {
                    showAlert('success', 'User deleted successfully');
                    this.closest('tr').remove();
                } else {
                    showAlert('danger', data.message || 'Error deleting user');
                }
            } catch (error) {
                showAlert('danger', 'An error occurred while deleting the user');
            }
        });
    });

    // Handle Edit User
    document.querySelectorAll('.edit-user').forEach(button => {
        button.addEventListener('click', async function() {
            const userId = this.dataset.userId;
            const row = this.closest('tr');
            
            const name = row.cells[0].textContent;
            const email = row.cells[1].textContent;
            const role = row.cells[2].textContent.toLowerCase();

            // Create and show modal
            const modal = createEditModal(userId, name, email, role);
            document.body.appendChild(modal);
            
            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();

            // Clean up modal when hidden
            modal.addEventListener('hidden.bs.modal', function() {
                modal.remove();
            });
        });
    });
});

// Helper function to create edit modal
function createEditModal(userId, name, email, role) {
    const modalHtml = `
        <div class="modal fade" id="editUserModal${userId}" tabindex="-1" aria-labelledby="editUserModalLabel${userId}" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="editUserModalLabel${userId}">Edit User</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form id="editUserForm${userId}">
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="name${userId}" class="form-label">Name</label>
                                <input type="text" class="form-control" id="name${userId}" name="name" value="${name}" required>
                            </div>
                            <div class="mb-3">
                                <label for="email${userId}" class="form-label">Email</label>
                                <input type="email" class="form-control" id="email${userId}" name="email" value="${email}" required>
                            </div>
                            <div class="mb-3">
                                <label for="role${userId}" class="form-label">Role</label>
                                <select class="form-select" id="role${userId}" name="role" required>
                                    <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin</option>
                                    <option value="user" ${role === 'user' ? 'selected' : ''}>User</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="password${userId}" class="form-label">New Password (leave blank to keep current)</label>
                                <input type="password" class="form-control" id="password${userId}" name="password">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    const modalElement = document.createRange().createContextualFragment(modalHtml).firstElementChild;
    
    // Add submit handler
    modalElement.querySelector('form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            // Remove password if empty
            if (!data.password) {
                delete data.password;
            }

            const response = await fetch(`/dashboard/settings/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const responseData = await response.json();
            
            if (response.ok) {
                showAlert('success', 'User updated successfully');
                location.reload();
            } else {
                showAlert('danger', responseData.message || 'Error updating user');
            }
        } catch (error) {
            showAlert('danger', 'An error occurred while updating the user');
        }
    });

    return modalElement;
}

// Helper function to show alerts
function showAlert(type, message) {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    const alertElement = document.createRange().createContextualFragment(alertHtml).firstElementChild;
    const container = document.querySelector('.container-fluid');
    container.insertBefore(alertElement, container.firstChild);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alertElement.remove();
    }, 5000);
}

