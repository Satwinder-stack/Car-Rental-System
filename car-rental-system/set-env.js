const fs = require('fs');
const path = require('path');

const apiUrl = process.env.NG_APP_API_URL || 'https://karlrental-backend.onrender.com';

const envConfigFile = `export const environment = {
  production: true,
  apiUrl: '${apiUrl}'
};
`;

const targetPath = path.join(__dirname, './src/environments/environment.prod.ts');

// Ensure the environments directory exists
fs.mkdirSync(path.dirname(targetPath), { recursive: true });

fs.writeFileSync(targetPath, envConfigFile);
console.log(`Generated environment.prod.ts pointing to: ${apiUrl}`);