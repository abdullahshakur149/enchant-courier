import { showSuccessAnimation } from './modules/successAnimation.js';

document.addEventListener('DOMContentLoaded', function() {
    // Handle login form submission
    const loginForm = document.querySelector('form.needs-validation');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!loginForm.checkValidity()) {
                e.stopPropagation();
                loginForm.classList.add('was-validated');
                return;
            }
            
            try {
                // Get form data
                const formData = new FormData(loginForm);
                const data = Object.fromEntries(formData.entries());
                
                // Send login request
                const response = await fetch('/auth', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Get the card element
                    const card = loginForm.closest('.card');
                    if (card) {
                        // Fade out the entire card
                        card.style.transition = 'opacity 0.3s ease-out';
                        card.style.opacity = '0';
                    }
                    
                    // Show success animation
                    showSuccessAnimation();
                    
                    // Redirect after animation
                    setTimeout(() => {
                        window.location.href = result.redirectUrl || '/dashboard';
                    }, 1000);
                } else {
                    // Show error message
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'alert alert-danger alert-dismissible fade show';
                    errorDiv.innerHTML = `
                        <i class="fas fa-exclamation-circle me-2"></i>
                        ${result.message || 'Login failed. Please try again.'}
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    `;
                    
                    // Remove any existing alerts
                    const existingAlert = document.querySelector('.alert');
                    if (existingAlert) {
                        existingAlert.remove();
                    }
                    
                    // Add the new alert before the form
                    loginForm.parentElement.insertBefore(errorDiv, loginForm);
                }
            } catch (error) {
                console.error('Error:', error);
                // Show error message
                const errorDiv = document.createElement('div');
                errorDiv.className = 'alert alert-danger alert-dismissible fade show';
                errorDiv.innerHTML = `
                    <i class="fas fa-exclamation-circle me-2"></i>
                    An error occurred. Please try again.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                `;
                
                // Remove any existing alerts
                const existingAlert = document.querySelector('.alert');
                if (existingAlert) {
                    existingAlert.remove();
                }
                
                // Add the new alert before the form
                loginForm.parentElement.insertBefore(errorDiv, loginForm);
            }
        });
    }
}); 