import express from 'express';
const router = express.Router();
import { CreateUser, getAllEmployees, deleteEmployeeController } from '../../controllers/admin/admin.controller.js';
import { checkAdmin } from '../../config/webAuth.js';

// Middleware to check authentication
router.use(checkAdmin);

router.post('/create-employee', CreateUser)
router.get('/get-employees', getAllEmployees)
router.delete('/delete-employee/:id', deleteEmployeeController);

export default router;