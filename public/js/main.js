import { showSuccessAnimation } from './modules/successAnimation.js';

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    // Handle form submission
    const form = document.querySelector('form#courierForm');
    console.log('Form found:', form);
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            console.log('Form submitted');
            e.preventDefault();
            
            if (!form.checkValidity()) {
                console.log('Form not valid');
                e.stopPropagation();
                form.classList.add('was-validated');
                return;
            }
            
            try {
                // Get form values
                const trackingNumber = form.querySelector('#trackingNumber').value.trim();
                const flyerId = form.querySelector('#flyerId').value.trim();
                const courierType = form.querySelector('input[name="courierType"]').value;
                
                console.log('Form values:', { trackingNumber, flyerId, courierType });
                
                // Validate values
                if (!trackingNumber || !flyerId || !courierType) {
                    showAlert('danger', 'Please fill in all required fields');
                    return;
                }
                
                // Create request data
                const requestData = {
                    trackingNumber,
                    flyerId,
                    courierType
                };
                
                console.log('Sending data:', requestData);
                
                const response = await fetch('/submit-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                });
                
                const result = await response.json();
                console.log('Response:', result);
                
                if (result.success) {
                    // Show success animation
                    showSuccessAnimation();
                    
                    // Fade out the form
                    form.style.transition = 'opacity 0.3s ease-out';
                    form.style.opacity = '0';
                    
                    // Quick reset for next scan
                    setTimeout(() => {
                        // Reset form
                        form.reset();
                        form.classList.remove('was-validated');
                        form.style.opacity = '1';
                        
                        // Immediately focus on tracking number
                        const trackingInput = document.getElementById('trackingNumber');
                        trackingInput.focus();
                        
                        // Show success message
                        showAlert('success', 'Order submitted successfully! Ready for next scan.');
                    }, 1000); // Reduced to 1 second for faster scanning
                } else {
                    showAlert('danger', result.message);
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert('danger', 'An error occurred. Please try again.');
            }
        });
    } else {
        console.error('Form not found!');
    }
    
    // Function to show alert messages
    function showAlert(type, message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Remove any existing alerts
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // Add the new alert before the form
        const form = document.querySelector('form');
        if (form) {
            form.parentElement.insertBefore(alertDiv, form);
        }
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}); 