import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();
const authController = new AuthController();

router.post('/signup', authController.signup.bind(authController));
router.post('/request-otp', authController.requestOTP.bind(authController));
router.post('/verify-otp', authController.verifyOTP.bind(authController));

export default router;