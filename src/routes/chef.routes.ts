import { Router } from 'express';
import { ChefController } from '../controllers/chef.controller';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();
const chefController = new ChefController();

// Public route for chef registration
router.post('/register', chefController.registerChef.bind(chefController));

// Protected routes
router.post(
    '/menu-items',
    authenticate,
    authorize([Role.chef]),
    uploadMiddleware.single('image'),
    chefController.createMenuItem.bind(chefController)
);

export default router; 