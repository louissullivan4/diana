import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
    console.error(
        `[Error] [${new Date().toISOString()}] Postgres pool idle client error:`,
        err
    );
});

export const db = {
    query: (text: string, params: any[]) => pool.query(text, params),
};
