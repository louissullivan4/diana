import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from './authService';

export interface AuthenticatedRequest extends Request {
    user?: {
        userId: number;
        username: string;
    };
}

/**
 * Middleware to require authentication for protected routes
 */
export function requireAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void {
    // Check for token in Authorization header or cookie
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.diana_token;

    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    } else if (cookieToken) {
        token = cookieToken;
    }

    if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    const payload = verifyToken(token);
    if (!payload) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }

    req.user = payload;
    next();
}

/**
 * Optional auth middleware - attaches user if token present but doesn't require it
 */
export function optionalAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.diana_token;

    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    } else if (cookieToken) {
        token = cookieToken;
    }

    if (token) {
        const payload = verifyToken(token);
        if (payload) {
            req.user = payload;
        }
    }

    next();
}
