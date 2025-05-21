// Common functions for handling API calls and loaders

// Show loader
function showLoader() {
    document.getElementById('pageLoader').classList.remove('d-none');
}

// Hide loader
function hideLoader() {
    document.getElementById('pageLoader').classList.add('d-none');
}

// Handle API errors
function handleApiError(error) {
    hideLoader();
    console.error('API Error:', error);
    // You can customize this to show error messages in your UI
    alert('An error occurred. Please try again.');
}

// Wrapper for fetch with loader
async function fetchWithLoader(url, options = {}) {
    showLoader();
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        hideLoader();
        return data;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
}

// Wrapper for form submission with loader
function handleFormSubmit(formId, submitUrl, method = 'POST') {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader();

        try {
            const formData = new FormData(form);
            const response = await fetch(submitUrl, {
                method: method,
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            hideLoader();
            return result;
        } catch (error) {
            handleApiError(error);
        }
    });
}

// Initialize loaders for all AJAX tables
function initializeTableLoaders() {
    const tables = document.querySelectorAll('.ajax-table');
    tables.forEach(table => {
        const loadingRow = table.querySelector('.loading-row');
        if (loadingRow) {
            loadingRow.style.display = 'none';
        }
    });
}

// Show table loader
function showTableLoader(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const loadingRow = table.querySelector('.loading-row');
    if (loadingRow) {
        loadingRow.style.display = 'table-row';
    }
}

// Hide table loader
function hideTableLoader(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const loadingRow = table.querySelector('.loading-row');
    if (loadingRow) {
        loadingRow.style.display = 'none';
    }
}

// Initialize all loaders when document is ready
document.addEventListener('DOMContentLoaded', function () {
    initializeTableLoaders();
}); 