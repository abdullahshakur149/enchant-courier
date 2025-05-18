// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'operational',
        message: 'Authentication API is healthy',
        timestamp: new Date()
    });
}); 