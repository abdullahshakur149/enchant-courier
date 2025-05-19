import { showSuccessAnimation } from './modules/successAnimation.js';

// Sidebar Toggle for Mobile
const sidebarCollapse = document.getElementById('sidebarCollapse');
if (sidebarCollapse) {
    sidebarCollapse.addEventListener('click', function () {
        document.querySelector('.sidebar').classList.toggle('active');
        document.querySelector('.main-content').classList.toggle('active');
    });
}

// Handle refresh stats button
const refreshStatsBtn = document.getElementById('refreshStats');
if (refreshStatsBtn) {
    refreshStatsBtn.addEventListener('click', async function () {
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
    exportDataBtn.addEventListener('click', async function () {
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
    viewReportsBtn.addEventListener('click', function () {
        // Redirect to reports page
        window.location.href = '/reports';
    });
}

// Notification System
const notificationBadge = document.getElementById('notification-badge');
let unreadCount = 0;

// Function to update notification badge
function updateNotificationBadge(count) {
    unreadCount = count;
    if (count > 0) {
        notificationBadge.textContent = count;
        notificationBadge.style.display = 'inline-block';
    } else {
        notificationBadge.style.display = 'none';
    }
}

// Function to fetch notifications
async function fetchNotifications() {
    try {
        const response = await fetch('/api/notifications');
        const data = await response.json();
        updateNotificationBadge(data.unreadCount);
    } catch (error) {
        console.error('Error fetching notifications:', error);
    }
}

// Initialize notifications
fetchNotifications();

// Test Sound Button
const testSoundBtn = document.getElementById('testSound');
if (testSoundBtn) {
    testSoundBtn.addEventListener('click', function () {
        // Initialize audio context if not already done
        if (!window.audioContext) {
            window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Play test sound
        playNotificationSound();

        // Show feedback
        const originalText = testSoundBtn.innerHTML;
        testSoundBtn.innerHTML = '<i class="fas fa-check me-1"></i> Sound Tested';
        testSoundBtn.classList.remove('btn-outline-primary');
        testSoundBtn.classList.add('btn-success');

        // Reset button after 2 seconds
        setTimeout(() => {
            testSoundBtn.innerHTML = originalText;
            testSoundBtn.classList.remove('btn-success');
            testSoundBtn.classList.add('btn-outline-primary');
        }, 2000);
    });
}

// Set up WebSocket connection
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

function setupWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        return;
    }

    // Use secure WebSocket (wss://) for HTTPS and regular WebSocket (ws://) for HTTP
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = function () {
        console.log('WebSocket connection established');
        reconnectAttempts = 0; // Reset reconnect attempts on successful connection
    };

    ws.onclose = function (event) {
        console.log('WebSocket connection closed:', event.code, event.reason);

        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            console.log(`Attempting to reconnect (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
            reconnectAttempts++;
            setTimeout(setupWebSocket, RECONNECT_DELAY);
        } else {
            console.error('Max reconnection attempts reached');
        }
    };

    ws.onerror = function (error) {
        console.error('WebSocket error:', error);
    };

    ws.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);
            console.log('Received WebSocket message:', data);

            if (data.type === 'notification') {
                console.log('Processing notification:', data);

                // Show browser notification
                if (Notification.permission === 'granted') {
                    new Notification(data.title, {
                        body: data.message,
                        icon: '/images/logo.png'
                    });
                }

                // Update badge count
                updateNotificationBadge(unreadCount + 1);
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    };
}

// Function to play notification sound
function playNotificationSound() {
    try {
        if (!window.audioContext) {
            console.log('Creating new audio context');
            window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (window.audioContext.state === 'suspended') {
            console.log('Resuming audio context');
            window.audioContext.resume();
        }

        const oscillator = window.audioContext.createOscillator();
        const gainNode = window.audioContext.createGain();

        // Configure sound
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, window.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, window.audioContext.currentTime + 0.1);

        // Configure volume
        gainNode.gain.setValueAtTime(0.3, window.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, window.audioContext.currentTime + 0.3);

        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(window.audioContext.destination);

        // Play sound
        oscillator.start();
        oscillator.stop(window.audioContext.currentTime + 0.3);

        console.log('Notification sound played successfully');
    } catch (error) {
        console.error('Error playing notification sound:', error);
    }
}

// Initialize WebSocket connection
setupWebSocket();

// Request notification permission
if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
    Notification.requestPermission();
}





