
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const targetClientIdStart = "PNNBnj";

console.log("Searching for Client ID starting with:", targetClientIdStart);

for (const [key, value] of Object.entries(envConfig)) {
    if (value.startsWith(targetClientIdStart)) {
        console.log(`✅ FOUND MATCH: ${key} = ${value}`);
        // Find potential secret candidates
        const secretKey = key.replace('CLIENT_ID', 'CLIENT_SECRET');
        if (envConfig[secretKey]) {
            console.log(`   Corresponding Secret Key: ${secretKey} (Exists: Yes)`);
            console.log(`   Secret Value starts with: ${envConfig[secretKey].substring(0, 5)}...`);
        }
    }
}
