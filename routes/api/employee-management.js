import express from 'express';
const router = express.Router();
import { CreateUser, getAllEmployees, deleteEmployeeController } from '../../controllers/admin/admin.controller.js';
import { checkAdmin } from '../../config/webAuth.js';
import { isAuthenticated } from '../../middleware/auth.js';

// Middleware to check authentication and admin status
router.use(isAuthenticated);
router.use(checkAdmin);

router.post('/create-employee', CreateUser)
router.get('/get-employees', getAllEmployees)
router.delete('/delete-employee/:id', deleteEmployeeController);

export default router;