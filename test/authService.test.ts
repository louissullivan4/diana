// Mock pg Pool before importing the module under test
jest.mock('pg', () => {
    const mockQuery = jest.fn();
    const mockPool = { query: mockQuery };
    return { Pool: jest.fn(() => mockPool) };
});

// Mock bcrypt
jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(),
    verify: jest.fn(),
}));

import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { Pool } from 'pg';

import {
    generateToken,
    verifyToken,
    authenticateUser,
    createUser,
    findUserByUsername,
    findUserById,
    hasUsers,
    listUsers,
    deleteUser,
    updatePassword,
    User,
} from '../packages/diana-core/src/core/auth/authService';

// Grab the shared mock query function from the mocked pool instance
const mockQuery = (new Pool() as any).query as jest.Mock;
const mockBcryptHash = bcrypt.hash as jest.Mock;
const mockBcryptCompare = bcrypt.compare as jest.Mock;
const mockJwtSign = jwt.sign as jest.Mock;
const mockJwtVerify = jwt.verify as jest.Mock;

const baseUser: User = {
    id: 1,
    username: 'testuser',
    created_at: new Date('2024-01-01'),
    last_login: null,
};

const userWithHash = { ...baseUser, password_hash: '$2b$12$hashedpassword' };

beforeEach(() => {
    jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// generateToken
// ---------------------------------------------------------------------------
describe('generateToken', () => {
    it('returns the string produced by jwt.sign', () => {
        mockJwtSign.mockReturnValue('signed.jwt.token');
        const result = generateToken(baseUser);
        expect(result).toBe('signed.jwt.token');
    });

    it('calls jwt.sign with the correct payload fields', () => {
        mockJwtSign.mockReturnValue('token');
        generateToken(baseUser);
        expect(mockJwtSign).toHaveBeenCalledWith(
            { userId: baseUser.id, username: baseUser.username },
            expect.any(String),
            expect.objectContaining({ expiresIn: '30d' })
        );
    });

    it('returns a string type', () => {
        mockJwtSign.mockReturnValue('some.token.value');
        expect(typeof generateToken(baseUser)).toBe('string');
    });
});

// ---------------------------------------------------------------------------
// verifyToken
// ---------------------------------------------------------------------------
describe('verifyToken', () => {
    it('returns the decoded payload for a valid token', () => {
        const payload = { userId: 1, username: 'testuser' };
        mockJwtVerify.mockReturnValue(payload);
        const result = verifyToken('valid.token');
        expect(result).toEqual(payload);
    });

    it('returns null when jwt.verify throws (invalid token)', () => {
        mockJwtVerify.mockImplementation(() => {
            throw new Error('invalid token');
        });
        expect(verifyToken('bad.token')).toBeNull();
    });

    it('returns null when jwt.verify throws a TokenExpiredError', () => {
        mockJwtVerify.mockImplementation(() => {
            const err = new Error('jwt expired');
            err.name = 'TokenExpiredError';
            throw err;
        });
        expect(verifyToken('expired.token')).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// findUserByUsername
// ---------------------------------------------------------------------------
describe('findUserByUsername', () => {
    it('returns the user row when found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [userWithHash] });
        const result = await findUserByUsername('testuser');
        expect(result).toEqual(userWithHash);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('WHERE username'),
            ['testuser']
        );
    });

    it('returns null when no user is found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        const result = await findUserByUsername('unknown');
        expect(result).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// findUserById
// ---------------------------------------------------------------------------
describe('findUserById', () => {
    it('returns the user row when found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [baseUser] });
        const result = await findUserById(1);
        expect(result).toEqual(baseUser);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('WHERE id'),
            [1]
        );
    });

    it('returns null when no user is found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        const result = await findUserById(999);
        expect(result).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// authenticateUser
// ---------------------------------------------------------------------------
describe('authenticateUser', () => {
    it('returns user and token when credentials are valid', async () => {
        // findUserByUsername query
        mockQuery.mockResolvedValueOnce({ rows: [userWithHash] });
        mockBcryptCompare.mockResolvedValueOnce(true);
        // UPDATE last_login query
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockJwtSign.mockReturnValue('auth.token');

        const result = await authenticateUser('testuser', 'correctpassword');
        expect(result).not.toBeNull();
        expect(result!.token).toBe('auth.token');
        expect(result!.user.username).toBe('testuser');
        // password_hash must be stripped from the returned user
        expect((result!.user as any).password_hash).toBeUndefined();
    });

    it('returns null when the password does not match', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [userWithHash] });
        mockBcryptCompare.mockResolvedValueOnce(false);

        const result = await authenticateUser('testuser', 'wrongpassword');
        expect(result).toBeNull();
    });

    it('returns null when the user does not exist', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const result = await authenticateUser('noone', 'password');
        expect(result).toBeNull();
        expect(mockBcryptCompare).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// createUser
// ---------------------------------------------------------------------------
describe('createUser', () => {
    it('hashes the password and inserts the user, returning the new row', async () => {
        mockBcryptHash.mockResolvedValueOnce('$2b$12$newhashedpassword');
        mockQuery.mockResolvedValueOnce({ rows: [baseUser] });

        const result = await createUser('testuser', 'plainpassword');
        expect(mockBcryptHash).toHaveBeenCalledWith('plainpassword', 12);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO users'),
            expect.arrayContaining(['testuser', '$2b$12$newhashedpassword'])
        );
        expect(result).toEqual(baseUser);
    });

    it('returns the User object without password_hash', async () => {
        mockBcryptHash.mockResolvedValueOnce('hashed');
        mockQuery.mockResolvedValueOnce({ rows: [baseUser] });

        const result = await createUser('alice', 'secret');
        expect((result as any).password_hash).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// hasUsers
// ---------------------------------------------------------------------------
describe('hasUsers', () => {
    it('returns true when count is greater than 0', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }] });
        expect(await hasUsers()).toBe(true);
    });

    it('returns false when count is 0', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
        expect(await hasUsers()).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// listUsers
// ---------------------------------------------------------------------------
describe('listUsers', () => {
    it('returns an array of users', async () => {
        const users: User[] = [
            baseUser,
            {
                id: 2,
                username: 'alice',
                created_at: new Date('2024-02-01'),
                last_login: null,
            },
        ];
        mockQuery.mockResolvedValueOnce({ rows: users });
        const result = await listUsers();
        expect(result).toEqual(users);
        expect(result).toHaveLength(2);
    });

    it('returns an empty array when no users exist', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        expect(await listUsers()).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// deleteUser
// ---------------------------------------------------------------------------
describe('deleteUser', () => {
    it('returns true when the user was deleted', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
        expect(await deleteUser('testuser')).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM users'),
            ['testuser']
        );
    });

    it('returns false when no user matched', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        expect(await deleteUser('ghost')).toBe(false);
    });

    it('returns false when rowCount is null', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: null });
        expect(await deleteUser('ghost')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// updatePassword
// ---------------------------------------------------------------------------
describe('updatePassword', () => {
    it('hashes the new password and updates the record, returning true', async () => {
        mockBcryptHash.mockResolvedValueOnce('$2b$12$updatedHash');
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

        const result = await updatePassword('testuser', 'newpassword');
        expect(mockBcryptHash).toHaveBeenCalledWith('newpassword', 12);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE users SET password_hash'),
            ['$2b$12$updatedHash', 'testuser']
        );
        expect(result).toBe(true);
    });

    it('returns false when the username does not match any row', async () => {
        mockBcryptHash.mockResolvedValueOnce('hashed');
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        expect(await updatePassword('nobody', 'pw')).toBe(false);
    });

    it('returns false when rowCount is null', async () => {
        mockBcryptHash.mockResolvedValueOnce('hashed');
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: null });

        expect(await updatePassword('nobody', 'pw')).toBe(false);
    });
});
