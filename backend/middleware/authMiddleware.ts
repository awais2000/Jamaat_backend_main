import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface AuthenticatedRequest extends Request {
    user?: { email: string; role: string };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const token = req.header("Authorization");

    if (!token) {
        res.status(401).json({ status: 401, message: "Access Denied. No Token Provided." });
        return;
    }

    try {
        const decoded = jwt.verify(token, "your_secret_key") as { email: string; role: string };
        req.user = decoded; 
        next(); 
    } catch (error) {
        res.status(403).json({ status: 403, message: "Invalid Token" });
    }
};

