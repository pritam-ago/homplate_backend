import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class UserController {
    async getUserProfile(req: Request, res: Response) {
        try {
            if (!req.user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User ID not found in token'
                });
            }
    
            const user = await prisma.user.findUnique({
                where: { id: req.user.userId },
                include: {
                    chef: req.user.role === 'chef',
                    deliveryPartner: req.user.role === 'delivery'
                }
            });
    
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
    
            const userData = {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                latitude: user.latitude,
                longitude: user.longitude,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt
            };
    
            // Add role-specific data if available
            if (user.chef) {
                Object.assign(userData, { chef: user.chef });
            }
            if (user.deliveryPartner) {
                Object.assign(userData, { deliveryPartner: user.deliveryPartner });
            }
    
            return res.json({
                success: true,
                data: {
                    user: userData
                }
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching profile',
                error: error.message
            });
        }
    }
}