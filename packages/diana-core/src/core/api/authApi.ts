import { Router, type Request, type Response } from 'express';
import { authenticateUser, findUserById } from '../auth/authService';
import { requireAuth, type AuthenticatedRequest } from '../auth/authMiddleware';

const router = Router();

/** Formatted timestamp for logs */
function timestamp(): string {
    return new Date().toISOString();
}

/** Log API requests */
function logAuth(method: string, path: string, message: string): void {
    console.log(`[${timestamp()}] [Diana:Auth] ${method} ${path} - ${message}`);
}

// Cookie settings for 30-day session
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
    path: '/',
};

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body as {
            username?: string;
            password?: string;
        };

        if (!username || !password) {
            logAuth('POST', '/api/auth/login', 'Missing credentials');
            res.status(400).json({ error: 'Username and password required' });
            return;
        }

        const result = await authenticateUser(username, password);
        if (!result) {
            logAuth(
                'POST',
                '/api/auth/login',
                `Failed login attempt for: ${username}`
            );
            res.status(401).json({ error: 'Invalid username or password' });
            return;
        }

        logAuth('POST', '/api/auth/login', `User logged in: ${username}`);

        // Set token as httpOnly cookie
        res.cookie('diana_token', result.token, COOKIE_OPTIONS);

        res.json({
            user: result.user,
            token: result.token,
        });
    } catch (err) {
        console.error(`[${timestamp()}] [Diana:Auth] Login error:`, err);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * POST /api/auth/logout
 * Clear the auth cookie
 */
router.post('/logout', (_req: Request, res: Response) => {
    logAuth('POST', '/api/auth/logout', 'User logged out');
    res.clearCookie('diana_token', { path: '/' });
    res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get(
    '/me',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Not authenticated' });
                return;
            }

            const user = await findUserById(req.user.userId);
            if (!user) {
                logAuth('GET', '/api/auth/me', 'User not found in database');
                res.status(404).json({ error: 'User not found' });
                return;
            }

            logAuth('GET', '/api/auth/me', `Returning user: ${user.username}`);
            res.json({ user });
        } catch (err) {
            console.error(`[${timestamp()}] [Diana:Auth] /me error:`, err);
            res.status(500).json({ error: 'Failed to get user' });
        }
    }
);

/**
 * GET /api/auth/check
 * Check if user is authenticated (doesn't require auth, just checks)
 */
router.get('/check', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.diana_token;

    const hasToken = !!(authHeader?.startsWith('Bearer ') || cookieToken);

    res.json({ authenticated: hasToken });
});

export const authApiRouter = router;
