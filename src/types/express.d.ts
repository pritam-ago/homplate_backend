import { Request } from 'express';

declare global {
    namespace Express {
        interface Request {
            files?: Express.Multer.File[];
            file?: Express.Multer.File;
        }
    }
} 