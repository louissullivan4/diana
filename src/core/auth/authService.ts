import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || 'diana-default-secret-change-me';
const JWT_EXPIRY = '30d'; // 1 month session duration
const SALT_ROUNDS = 12;

export interface User {
    id: number;
    username: string;
    created_at: Date;
    last_login: Date | null;
}

export interface JwtPayload {
    userId: number;
    username: string;
}

/**
 * Verify a JWT token and return the payload
 */
export function verifyToken(token: string): JwtPayload | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        return decoded;
    } catch {
        return null;
    }
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: User): string {
    const payload: JwtPayload = {
        userId: user.id,
        username: user.username,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Find a user by username
 */
export async function findUserByUsername(
    username: string
): Promise<(User & { password_hash: string }) | null> {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [
        username,
    ]);
    return result.rows[0] || null;
}

/**
 * Find a user by ID
 */
export async function findUserById(id: number): Promise<User | null> {
    const result = await pool.query(
        'SELECT id, username, created_at, last_login FROM users WHERE id = $1',
        [id]
    );
    return result.rows[0] || null;
}

/**
 * Authenticate a user with username and password
 */
export async function authenticateUser(
    username: string,
    password: string
): Promise<{ user: User; token: string } | null> {
    const user = await findUserByUsername(username);
    if (!user) {
        return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
        return null;
    }

    // Update last login time
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [
        user.id,
    ]);

    const token = generateToken(user);
    const { password_hash: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
}

/**
 * Create a new user (for the add-user script)
 */
export async function createUser(
    username: string,
    password: string
): Promise<User> {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Generate a random ID (1-999999) to avoid IDENTITY/SERIAL issues
    const randomId = Math.floor(Math.random() * 999999) + 1;

    const result = await pool.query(
        'INSERT INTO users (id, username, password_hash) VALUES ($1, $2, $3) RETURNING id, username, created_at, last_login',
        [randomId, username, passwordHash]
    );

    return result.rows[0];
}

/**
 * Check if any users exist (for initial setup)
 */
export async function hasUsers(): Promise<boolean> {
    const result = await pool.query('SELECT COUNT(*) FROM users');
    return parseInt(result.rows[0].count, 10) > 0;
}

/**
 * List all users (for admin purposes)
 */
export async function listUsers(): Promise<User[]> {
    const result = await pool.query(
        'SELECT id, username, created_at, last_login FROM users ORDER BY created_at'
    );
    return result.rows;
}

/**
 * Delete a user by username
 */
export async function deleteUser(username: string): Promise<boolean> {
    const result = await pool.query(
        'DELETE FROM users WHERE username = $1 RETURNING id',
        [username]
    );
    return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Update a user's password
 */
export async function updatePassword(
    username: string,
    newPassword: string
): Promise<boolean> {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const result = await pool.query(
        'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING id',
        [passwordHash, username]
    );
    return result.rowCount !== null && result.rowCount > 0;
}
