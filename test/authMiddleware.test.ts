// Mock the authService module so we can control verifyToken without touching pg/bcrypt/jwt
jest.mock('../packages/diana-core/src/core/auth/authService', () => ({
    verifyToken: jest.fn(),
}));

import type { Response, NextFunction } from 'express';
import { verifyToken } from '../packages/diana-core/src/core/auth/authService';
import {
    requireAuth,
    optionalAuth,
    AuthenticatedRequest,
} from '../packages/diana-core/src/core/auth/authMiddleware';

const mockVerifyToken = verifyToken as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeReq(
    overrides: Partial<AuthenticatedRequest> = {}
): AuthenticatedRequest {
    return {
        headers: {},
        cookies: {},
        ...overrides,
    } as unknown as AuthenticatedRequest;
}

function makeRes(): { res: Response; status: jest.Mock; json: jest.Mock } {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;
    return { res, status, json };
}

beforeEach(() => {
    jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// requireAuth
// ---------------------------------------------------------------------------
describe('requireAuth', () => {
    it('calls next() and attaches user when a valid Bearer token is present', () => {
        const payload = { userId: 1, username: 'alice' };
        mockVerifyToken.mockReturnValue(payload);

        const req = makeReq({
            headers: { authorization: 'Bearer valid.token' },
        });
        const { res, status } = makeRes();
        const next: NextFunction = jest.fn();

        requireAuth(req, res, next);

        expect(mockVerifyToken).toHaveBeenCalledWith('valid.token');
        expect(req.user).toEqual(payload);
        expect(next).toHaveBeenCalledTimes(1);
        expect(status).not.toHaveBeenCalled();
    });

    it('calls next() and attaches user when a valid cookie token is present', () => {
        const payload = { userId: 2, username: 'bob' };
        mockVerifyToken.mockReturnValue(payload);

        const req = makeReq({ cookies: { diana_token: 'cookie.token' } });
        const { res, status } = makeRes();
        const next: NextFunction = jest.fn();

        requireAuth(req, res, next);

        expect(mockVerifyToken).toHaveBeenCalledWith('cookie.token');
        expect(req.user).toEqual(payload);
        expect(next).toHaveBeenCalledTimes(1);
        expect(status).not.toHaveBeenCalled();
    });

    it('prefers Bearer header over cookie when both are present', () => {
        const payload = { userId: 3, username: 'carol' };
        mockVerifyToken.mockReturnValue(payload);

        const req = makeReq({
            headers: { authorization: 'Bearer header.token' },
            cookies: { diana_token: 'cookie.token' },
        });
        const { res } = makeRes();
        const next: NextFunction = jest.fn();

        requireAuth(req, res, next);

        expect(mockVerifyToken).toHaveBeenCalledWith('header.token');
    });

    it('responds 401 when no token is provided at all', () => {
        const req = makeReq();
        const { res, status, json } = makeRes();
        const next: NextFunction = jest.fn();

        requireAuth(req, res, next);

        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith({ error: 'Authentication required' });
        expect(next).not.toHaveBeenCalled();
        expect(mockVerifyToken).not.toHaveBeenCalled();
    });

    it('responds 401 when the Authorization header is present but not a Bearer scheme', () => {
        const req = makeReq({
            headers: { authorization: 'Basic dXNlcjpwYXNz' },
        });
        const { res, status, json } = makeRes();
        const next: NextFunction = jest.fn();

        requireAuth(req, res, next);

        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith({ error: 'Authentication required' });
        expect(next).not.toHaveBeenCalled();
    });

    it('responds 401 when verifyToken returns null (invalid token)', () => {
        mockVerifyToken.mockReturnValue(null);

        const req = makeReq({ headers: { authorization: 'Bearer bad.token' } });
        const { res, status, json } = makeRes();
        const next: NextFunction = jest.fn();

        requireAuth(req, res, next);

        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith({
            error: 'Invalid or expired token',
        });
        expect(next).not.toHaveBeenCalled();
        expect(req.user).toBeUndefined();
    });

    it('responds 401 when the cookie token is invalid', () => {
        mockVerifyToken.mockReturnValue(null);

        const req = makeReq({
            cookies: { diana_token: 'expired.cookie.token' },
        });
        const { res, status, json } = makeRes();
        const next: NextFunction = jest.fn();

        requireAuth(req, res, next);

        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith({
            error: 'Invalid or expired token',
        });
        expect(next).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// optionalAuth
// ---------------------------------------------------------------------------
describe('optionalAuth', () => {
    it('calls next() without attaching a user when no token is present', () => {
        const req = makeReq();
        const { res, status } = makeRes();
        const next: NextFunction = jest.fn();

        optionalAuth(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.user).toBeUndefined();
        expect(status).not.toHaveBeenCalled();
        expect(mockVerifyToken).not.toHaveBeenCalled();
    });

    it('attaches user and calls next() when Bearer token is valid', () => {
        const payload = { userId: 4, username: 'dave' };
        mockVerifyToken.mockReturnValue(payload);

        const req = makeReq({
            headers: { authorization: 'Bearer good.token' },
        });
        const { res, status } = makeRes();
        const next: NextFunction = jest.fn();

        optionalAuth(req, res, next);

        expect(req.user).toEqual(payload);
        expect(next).toHaveBeenCalledTimes(1);
        expect(status).not.toHaveBeenCalled();
    });

    it('attaches user and calls next() when cookie token is valid', () => {
        const payload = { userId: 5, username: 'eve' };
        mockVerifyToken.mockReturnValue(payload);

        const req = makeReq({ cookies: { diana_token: 'valid.cookie' } });
        const { res, status } = makeRes();
        const next: NextFunction = jest.fn();

        optionalAuth(req, res, next);

        expect(req.user).toEqual(payload);
        expect(next).toHaveBeenCalledTimes(1);
        expect(status).not.toHaveBeenCalled();
    });

    it('calls next() without attaching a user when token is invalid', () => {
        mockVerifyToken.mockReturnValue(null);

        const req = makeReq({ headers: { authorization: 'Bearer bad.token' } });
        const { res, status } = makeRes();
        const next: NextFunction = jest.fn();

        optionalAuth(req, res, next);

        expect(req.user).toBeUndefined();
        expect(next).toHaveBeenCalledTimes(1);
        expect(status).not.toHaveBeenCalled();
    });

    it('prefers Bearer header over cookie when both are present', () => {
        const payload = { userId: 6, username: 'frank' };
        mockVerifyToken.mockReturnValue(payload);

        const req = makeReq({
            headers: { authorization: 'Bearer header.token' },
            cookies: { diana_token: 'cookie.token' },
        });
        const { res } = makeRes();
        const next: NextFunction = jest.fn();

        optionalAuth(req, res, next);

        expect(mockVerifyToken).toHaveBeenCalledWith('header.token');
        expect(mockVerifyToken).toHaveBeenCalledTimes(1);
    });

    it('does not send any HTTP response regardless of token validity', () => {
        // invalid token case
        mockVerifyToken.mockReturnValue(null);
        const req = makeReq({ cookies: { diana_token: 'bad' } });
        const { res, status, json } = makeRes();
        const next: NextFunction = jest.fn();

        optionalAuth(req, res, next);

        expect(status).not.toHaveBeenCalled();
        expect(json).not.toHaveBeenCalled();
    });
});
