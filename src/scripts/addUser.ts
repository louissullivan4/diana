#!/usr/bin/env ts-node
/**
 * Add User Script
 * 
 * Usage:
 *   npx ts-node src/scripts/addUser.ts <username> <password>
 *   npm run add-user -- <username> <password>
 * 
 * Examples:
 *   npx ts-node src/scripts/addUser.ts admin MySecurePass123
 *   npm run add-user -- admin MySecurePass123
 */

import 'dotenv/config';
import { createUser, findUserByUsername, listUsers, deleteUser, updatePassword } from '../core/auth/authService';

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === '--help' || command === '-h') {
        printUsage();
        process.exit(0);
    }

    try {
        switch (command) {
            case 'add': {
                const username = args[1];
                const password = args[2];
                
                if (!username || !password) {
                    console.error('Error: Username and password are required');
                    console.log('Usage: npm run user -- add <username> <password>');
                    process.exit(1);
                }

                if (password.length < 8) {
                    console.error('Error: Password must be at least 8 characters');
                    process.exit(1);
                }

                const existing = await findUserByUsername(username);
                if (existing) {
                    console.error(`Error: User "${username}" already exists`);
                    process.exit(1);
                }

                const user = await createUser(username, password);
                console.log(`✓ User created successfully`);
                console.log(`  Username: ${user.username}`);
                console.log(`  ID: ${user.id}`);
                console.log(`  Created: ${user.created_at}`);
                break;
            }

            case 'list': {
                const users = await listUsers();
                if (users.length === 0) {
                    console.log('No users found.');
                } else {
                    console.log(`Found ${users.length} user(s):\n`);
                    for (const user of users) {
                        console.log(`  [${user.id}] ${user.username}`);
                        console.log(`      Created: ${user.created_at}`);
                        console.log(`      Last login: ${user.last_login || 'Never'}`);
                        console.log('');
                    }
                }
                break;
            }

            case 'delete': {
                const username = args[1];
                if (!username) {
                    console.error('Error: Username is required');
                    console.log('Usage: npm run user -- delete <username>');
                    process.exit(1);
                }

                const deleted = await deleteUser(username);
                if (deleted) {
                    console.log(`✓ User "${username}" deleted successfully`);
                } else {
                    console.error(`Error: User "${username}" not found`);
                    process.exit(1);
                }
                break;
            }

            case 'passwd': {
                const username = args[1];
                const newPassword = args[2];

                if (!username || !newPassword) {
                    console.error('Error: Username and new password are required');
                    console.log('Usage: npm run user -- passwd <username> <new-password>');
                    process.exit(1);
                }

                if (newPassword.length < 8) {
                    console.error('Error: Password must be at least 8 characters');
                    process.exit(1);
                }

                const updated = await updatePassword(username, newPassword);
                if (updated) {
                    console.log(`✓ Password updated for user "${username}"`);
                } else {
                    console.error(`Error: User "${username}" not found`);
                    process.exit(1);
                }
                break;
            }

            default:
                console.error(`Unknown command: ${command}`);
                printUsage();
                process.exit(1);
        }
    } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : err);
        process.exit(1);
    }

    process.exit(0);
}

function printUsage() {
    console.log(`
Diana User Management Script

Usage:
  npm run user -- <command> [arguments]

Commands:
  add <username> <password>    Create a new user
  list                         List all users
  delete <username>            Delete a user
  passwd <username> <password> Change a user's password

Examples:
  npm run user -- add admin MySecurePass123
  npm run user -- list
  npm run user -- delete olduser
  npm run user -- passwd admin NewPassword456

Notes:
  - Passwords must be at least 8 characters
  - Usernames must be unique
`);
}

main();
