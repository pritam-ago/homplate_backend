import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate} from '../middleware/auth.middleware';

const router = Router();
const userController = new UserController();

router.get('/profile', authenticate, userController.getUserProfile.bind(userController));

export default router;