import { Router } from 'express';
import { EmergencyWarningController } from '../controllers/EmergencyWarningController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const controller = new EmergencyWarningController();

// All routes require authentication
router.use(authenticateToken);

// Get all emergency warnings
router.get('/', controller.getWarnings);

// Get latest warning
router.get('/latest', controller.getLatestWarning);

export default router;
