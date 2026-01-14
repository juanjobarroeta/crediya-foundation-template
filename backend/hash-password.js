// Quick script to generate bcrypt hash for password
const bcrypt = require('bcryptjs');

const password = 'admin123';
const hash = bcrypt.hashSync(password, 10);

console.log('Password:', password);
console.log('Bcrypt hash:', hash);
console.log('\nCopy this hash and update the password field in Railway Postgres');

