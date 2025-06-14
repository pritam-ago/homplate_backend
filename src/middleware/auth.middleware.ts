import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Extend Express Request type to include user property
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                role: string;
                phone: string;
            };
        }
    }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication token is required'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as {
            userId: string;
            role: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
            email: string;
            name: string;
            address: string;
            latitude: number;
            longitude: number;
        };

        req.user = decoded;
        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

export const authorize = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        return next();
    };
}; 