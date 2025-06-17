import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { S3Service } from '../services/s3.service';
import { generateOTP } from '../utils/otp.utils';

const prisma = new PrismaClient();
const s3Service = new S3Service();

export class ChefController {

    async registerChef(req: Request, res: Response) {
        try {
            const { name, phone, email, address, latitude, longitude, bio } = req.body;

            // Check if user already exists with this phone number (regardless of role)
            const existingUser = await prisma.user.findUnique({
                where: {
                    phone: phone
                }
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'A user with this phone number already exists'
                });
            }

            // Create user and chef in a transaction
            const result = await prisma.$transaction(async (tx) => {
                const user = await tx.user.create({
                    data: {
                        name,
                        phone,
                        email,
                        address,
                        latitude,
                        longitude,
                        role: 'chef',
                        isActive: true,
                        createdAt: new Date()
                    }
                });

                const chef = await tx.chef.create({
                    data: {
                        id: user.id,
                        bio: bio || '',
                        isAvailable: true
                    }
                });

                return { user, chef };
            });

            // Generate and send OTP for verification
            await generateOTP(phone);

            return res.status(201).json({
                success: true,
                message: 'Chef registered successfully. Please verify your phone number with OTP.',
                data: {
                    id: result.user.id,
                    name: result.user.name,
                    phone: result.user.phone,
                    email: result.user.email,
                    role: result.user.role,
                    chef: {
                        bio: result.chef.bio,
                        isAvailable: result.chef.isAvailable
                    }
                }
            });
        } catch (error) {
            console.error('Error in chef registration:', error);
            
            // Handle Prisma unique constraint error specifically
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return res.status(400).json({
                    success: false,
                    message: 'A user with this phone number already exists'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async createMenuItem(req: Request, res: Response) {
        try {
            const { itemName, description, price } = req.body;
            const chefId = req.user?.userId;
            const file = req.file;

            if (!chefId) {
                return res.status(401).json({
                    success: false,
                    message: 'Chef ID not found in token'
                });
            }

            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: 'Image is required'
                });
            }

            // Upload image to S3
            const imageUrl = await s3Service.uploadImage(file);

            const menuItem = await prisma.menuItem.create({
                data: {
                    itemName,
                    description,
                    price: parseFloat(price),
                    imageUrl,
                    chefId
                }
            });

            return res.status(201).json({
                success: true,
                message: 'Menu item created successfully',
                data: menuItem
            });
        } catch (error) {
            console.error('Error creating menu item:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create menu item',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}