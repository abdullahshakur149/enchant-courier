import { showSuccessAnimation } from './modules/successAnimation.js';

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM Content Loaded');

    // Handle form submission
    const form = document.querySelector('form#courierForm');
    console.log('Form found:', form);

    const trackingInput = document.getElementById('trackingNumber');
    const flyerInput = document.getElementById('flyerId');

    if (form && trackingInput && flyerInput) {
        // Move focus to flyerId when Enter is pressed in trackingNumber
        trackingInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                flyerInput.focus();
            }
        });

        // Submit form when Enter is pressed in flyerId
        flyerInput.addEventListener('keydown', function (e) {
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

            try {
                const trackingNumber = trackingInput.value.trim();
                const flyerId = flyerInput.value.trim();
                const courierType = form.querySelector('input[name="courierType"]').value;

                console.log('Form values:', { trackingNumber, flyerId, courierType });

                if (!trackingNumber || !flyerId || !courierType) {
                    showAlert('danger', 'Please fill in all required fields');
                    return;
                }

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
                    showAlert('danger', result.message);
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert('danger', 'An error occurred. Please try again.');
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
