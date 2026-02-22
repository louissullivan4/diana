import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export const db = {
    query: (text: string, params: any[]) => pool.query(text, params),
};
