#!/usr/bin/env node
/**
 * Pre-commit hook: auto-bumps patch version for any package with staged source changes.
 * Also updates cross-package dependency references for bumped packages.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const PACKAGES = [
    { dir: 'packages/diana-core', pkg: 'packages/diana-core/package.json', name: 'diana-core' },
    { dir: 'packages/diana-discord', pkg: 'packages/diana-discord/package.json', name: 'diana-discord' },
    { dir: 'apps/server', pkg: 'apps/server/package.json', name: 'diana-server' },
    { dir: 'dashboard', pkg: 'dashboard/package.json', name: 'diana-dashboard' },
];

const staged = execSync('git diff --cached --name-only', { cwd: ROOT })
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean);

if (staged.length === 0) process.exit(0);

const bumpedVersions = {};

for (const { dir, pkg, name } of PACKAGES) {
    // Only bump if source files changed (not just the package.json itself)
    const hasSourceChanges = staged.some((f) => f.startsWith(dir + '/') && f !== pkg);
    if (!hasSourceChanges) continue;

    const pkgPath = path.join(ROOT, pkg);
    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const [major, minor, patch] = pkgJson.version.split('.').map(Number);
    pkgJson.version = `${major}.${minor}.${patch + 1}`;

    fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 4) + '\n');
    execSync(`git add "${pkgPath.replace(/\\/g, '/')}"`, { cwd: ROOT });

    bumpedVersions[name] = pkgJson.version;
}

// Update cross-package dependency references for any bumped packages
for (const [bumpedName, newVersion] of Object.entries(bumpedVersions)) {
    for (const { pkg } of PACKAGES) {
        const pkgPath = path.join(ROOT, pkg);
        const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        let changed = false;

        for (const depField of ['dependencies', 'devDependencies', 'peerDependencies']) {
            if (pkgJson[depField]?.[bumpedName]) {
                pkgJson[depField][bumpedName] = newVersion;
                changed = true;
            }
        }

        if (changed) {
            fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 4) + '\n');
            execSync(`git add "${pkgPath.replace(/\\/g, '/')}"`, { cwd: ROOT });
        }
    }
}

if (Object.keys(bumpedVersions).length > 0) {
    console.log('Auto-bumped package versions:');
    for (const [name, version] of Object.entries(bumpedVersions)) {
        console.log(`  ${name} → ${version}`);
    }
}
