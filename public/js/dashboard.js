import { showSuccessAnimation } from './modules/successAnimation.js';

// Sidebar Toggle for Mobile
const sidebarCollapse = document.getElementById('sidebarCollapse');
if (sidebarCollapse) {
    sidebarCollapse.addEventListener('click', function() {
        document.querySelector('.sidebar').classList.toggle('active');
        document.querySelector('.main-content').classList.toggle('active');
    });
}

// Handle refresh stats button
const refreshStatsBtn = document.getElementById('refreshStats');
if (refreshStatsBtn) {
    refreshStatsBtn.addEventListener('click', async function() {
        try {
            // Get the stats card container
            const statsContainer = document.querySelector('.row.g-4.mb-4');
            if (statsContainer) {
                // Fade out the stats
                statsContainer.style.transition = 'opacity 0.3s ease-out';
                statsContainer.style.opacity = '0';
                
                // Show success animation
                showSuccessAnimation();
                
                // Simulate API call delay
                setTimeout(async () => {
                    try {
                        // Here you would typically make an API call to get fresh stats
                        // For now, we'll just fade the stats back in
                        statsContainer.style.opacity = '1';
                        
                        // Show success message
                        const alertDiv = document.createElement('div');
                        alertDiv.className = 'alert alert-success alert-dismissible fade show';
                        alertDiv.innerHTML = `
                            <i class="fas fa-check-circle me-2"></i>
                            Stats refreshed successfully!
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        `;
                        
                        // Add the alert before the stats container
                        statsContainer.parentElement.insertBefore(alertDiv, statsContainer);
                        
                        // Auto-dismiss after 5 seconds
                        setTimeout(() => {
                            alertDiv.remove();
                        }, 5000);
                    } catch (error) {
                        console.error('Error refreshing stats:', error);
                        // Show error message
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'alert alert-danger alert-dismissible fade show';
                        errorDiv.innerHTML = `
                            <i class="fas fa-exclamation-circle me-2"></i>
                            Failed to refresh stats. Please try again.
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        `;
                        
                        // Add the error alert before the stats container
                        statsContainer.parentElement.insertBefore(errorDiv, statsContainer);
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });
}

// Handle export data button
const exportDataBtn = document.getElementById('exportData');
if (exportDataBtn) {
    exportDataBtn.addEventListener('click', async function() {
        try {
            // Get the button's parent card
            const card = exportDataBtn.closest('.card');
            if (card) {
                // Fade out the card
                card.style.transition = 'opacity 0.3s ease-out';
                card.style.opacity = '0';
                
                // Show success animation
                showSuccessAnimation();
                
                // Simulate export delay
                setTimeout(() => {
                    // Fade the card back in
                    card.style.opacity = '1';
                    
                    // Show success message
                    const alertDiv = document.createElement('div');
                    alertDiv.className = 'alert alert-success alert-dismissible fade show';
                    alertDiv.innerHTML = `
                        <i class="fas fa-check-circle me-2"></i>
                        Data exported successfully!
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    `;
                    
                    // Add the alert before the card
                    card.parentElement.insertBefore(alertDiv, card);
                    
                    // Auto-dismiss after 5 seconds
                    setTimeout(() => {
                        alertDiv.remove();
                    }, 5000);
                }, 1000);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });
}

// Handle view reports button
const viewReportsBtn = document.getElementById('viewReports');
if (viewReportsBtn) {
    viewReportsBtn.addEventListener('click', function() {
        // Redirect to reports page
        window.location.href = '/reports';
    });
} 




