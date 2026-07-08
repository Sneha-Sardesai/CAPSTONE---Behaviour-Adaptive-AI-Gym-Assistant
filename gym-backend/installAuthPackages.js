#!/usr/bin/env node

/**
 * Install required packages for authentication
 */

const { execSync } = require('child_process');

const packages = ['bcryptjs', 'jsonwebtoken'];

console.log('📦 Installing authentication packages...');

try {
  execSync(`npm install ${packages.join(' ')}`, {
    cwd: __dirname,
    stdio: 'inherit'
  });
  console.log('✅ Packages installed successfully');
} catch (error) {
  console.error('❌ Failed to install packages:', error.message);
}
