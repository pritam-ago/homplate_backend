import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateOTP, sendOTP, verifyOTP } from '../utils/otp.utils';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export class AuthController {
    // Customer signup
    async signup(req: Request, res: Response) {
        try {
            const { name, phone, email, address, latitude, longitude } = req.body;

            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { phone }
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User already exists with this phone number'
                });
            }

            // Create new user with customer role
            const user = await prisma.user.create({
                data: {
                    name,
                    phone,
                    email,
                    address,
                    latitude,
                    longitude,
                    role: 'customer'
                }
            });

            // Generate and send OTP for verification
            const otp = await generateOTP(phone);
            await sendOTP(phone, otp);

            return res.status(201).json({
                success: true,
                message: 'User registered successfully. Please verify your phone number.',
                data: {
                    userId: user.id,
                    phone: user.phone
                }
            });
        } catch (error: any) {
            console.error('Signup error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error during signup',
                error: error.message
            });
        }
    }

    // Request OTP for login
    async requestOTP(req: Request, res: Response) {
        try {
            const { phone, role } = req.body;

            // Validate role
            if (!['customer', 'chef', 'delivery'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role specified'
                });
            }

            // Check if user exists
            const user = await prisma.user.findUnique({
                where: { phone }
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Verify role
            if (user.role !== role) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid role for this user'
                });
            }

            // Generate and send OTP
            const otp = await generateOTP(phone);
            await sendOTP(phone, otp);

            return res.status(200).json({
                success: true,
                message: 'OTP sent successfully',
                data: {
                    phone,
                    role
                }
            });
        } catch (error: any) {
            console.error('OTP request error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error requesting OTP',
                error: error.message
            });
        }
    }

    // Verify OTP and login
    async verifyOTP(req: Request, res: Response) {
        try {
            const { phone, otp, role } = req.body;

            // Verify OTP using Twilio
            const isValid = await verifyOTP(phone, otp);
            if (!isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired OTP'
                });
            }

            // Get user details
            const user = await prisma.user.findUnique({
                where: { phone },
                include: {
                    chef: role === 'chef',
                    deliveryPartner: role === 'delivery'
                }
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Verify role
            if (user.role !== role) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid role for this user'
                });
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    userId: user.id,
                    role: user.role,
                    phone: user.phone
                },
                JWT_SECRET,
                { expiresIn: '7d' } // Token expires in 7 days
            );

            return res.status(200).json({
                success: true,
                message: 'OTP verified successfully',
                data: {
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        phone: user.phone,
                        email: user.email,
                        role: user.role,
                        ...(role === 'chef' && { chef: user.chef }),
                        ...(role === 'delivery' && { deliveryPartner: user.deliveryPartner })
                    }
                }
            });
        } catch (error: any) {
            console.error('OTP verification error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error verifying OTP',
                error: error.message
            });
        }
    }
}
