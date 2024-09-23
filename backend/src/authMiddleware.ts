import express, { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
require('dotenv').config(); 

const JWT_SECRET = "123456";
// Custom interface to extend the Request object with userId
interface AuthRequest extends Request {
    userId?: string;
}

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): Response | void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({
            message: "Invalid Auth Token!"
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

        req.userId = decoded.userId as string;

        next();
    } catch (err) {
        return res.status(403).json({
            message: "Token verification failed!"
        });
    }
};

export { authMiddleware };
