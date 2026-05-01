const fs = require('fs');

// Get the backend URL from Netlify's environment variables or default to the live Render backend
const apiUrl = process.env.NG_APP_API_URL || 'https://karlrental-backend.onrender.com';

const envConfigFile = `export const environment = {
  production: true,
  apiUrl: '${apiUrl}'
};
`;

// Write the configuration directly into Angular's production environment file path
fs.writeFileSync('./src/environments/environment.prod.ts', envConfigFile);
console.log('Successfully generated environment.prod.ts');