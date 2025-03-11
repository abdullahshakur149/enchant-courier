import express from 'express';
const router = express.Router();

router.get('/:courier', (req, res, next) => {
    const { courier } = req.params;
    res.render('track', { courier });
});

export default router;
