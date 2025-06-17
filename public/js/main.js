import { showSuccessAnimation } from './modules/successAnimation.js';

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM Content Loaded');

    // Handle form submission
    const form = document.getElementById('courierForm');
    console.log('Form found:', form);

    const trackingInput = document.getElementById('trackingNumber');
    const submitButton = form?.querySelector('button[type="submit"]');

    if (form && trackingInput) {
        // Move focus to flyerId when Enter is pressed in trackingNumber
        trackingInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });

        // Submit form when Enter is pressed in flyerId
        trackingInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
        });

        form.addEventListener('submit', async function (e) {
            console.log('Form submitted');
            e.preventDefault();

            if (!form.checkValidity()) {
                console.log('Form not valid');
                e.stopPropagation();
                form.classList.add('was-validated');
                return;
            }

            // Disable submit button to prevent double submission
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Submitting...';
            }

            try {
                const trackingNumber = trackingInput.value.trim();
                const courierType = document.getElementById('courierType').value.trim();

                console.log('Form values:', { trackingNumber, courierType });

                if (!trackingNumber || !courierType) {
                    showAlert('danger', 'Please fill in all required fields');
                    return;
                }

                // Validate tracking number format
                if (!/^[A-Za-z0-9-]+$/.test(trackingNumber)) {
                    showAlert('danger', 'Invalid tracking number format. Only letters, numbers, and hyphens are allowed.');
                    return;
                }

                const response = await fetch('/courier/submit-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        trackingNumber,
                        courierType
                    })
                });

                const result = await response.json();
                console.log('Response:', result);

                if (result.success) {
                    showSuccessAnimation();

                    // Fade out the form
                    form.style.transition = 'opacity 0.3s ease-out';
                    form.style.opacity = '0';

                    setTimeout(() => {
                        form.reset();
                        form.classList.remove('was-validated');
                        form.style.opacity = '1';
                        trackingInput.focus();
                        showAlert('success', 'Order submitted successfully! Ready for next scan.');
                    }, 1000);
                } else {
                    showAlert('danger', result.message || 'Failed to submit order. Please try again.');
                }
            } catch (error) {
                console.error('Error submitting order:', error);
                showAlert('danger', 'An unexpected error occurred. Please try again later.');
            } finally {
                // Re-enable submit button
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Submit Tracking';
                }
            }
        });
    } else {
        console.error('Form or inputs not found!');
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

        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        const form = document.querySelector('form');
        if (form) {
            form.parentElement.insertBefore(alertDiv, form);
        }

        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
});
