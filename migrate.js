const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Get URI from .env.local manually since we are running a bare node script
const envLocal = fs.readFileSync('.env.local', 'utf8');
const mongoUriLine = envLocal.split('\n').find(line => line.startsWith('MONGODB_URI='));
if (!mongoUriLine) {
    console.error("MONGODB_URI not found in .env.local");
    process.exit(1);
}
const uri = mongoUriLine.substring(mongoUriLine.indexOf('=') + 1).trim();

const DATA_DIR = path.join(process.cwd(), 'data');
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'campaigns.json');
const MASTER_CONTACTS_FILE = path.join(DATA_DIR, 'master_contacts.json');
const TEMPLATES_FILE = path.join(DATA_DIR, 'templates.json');
const DB_NAME = "email_marketing";

function sanitizeKeys(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeKeys);
    
    const newObj = {};
    for (let key in obj) {
        // Replace dot with underscore in keys
        const newKey = key.replace(/\./g, '_');
        newObj[newKey] = sanitizeKeys(obj[key]);
    }
    return newObj;
}

async function migrate() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log("Connected to MongoDB");
        const db = client.db(DB_NAME);

        // 1. Migrate Campaigns
        if (fs.existsSync(CAMPAIGNS_FILE)) {
            const campaigns = JSON.parse(fs.readFileSync(CAMPAIGNS_FILE, 'utf8'));
            if (campaigns.length > 0) {
                console.log(`Migrating ${campaigns.length} campaigns...`);
                for (let c of campaigns) {
                    c = sanitizeKeys(c);
                    await db.collection('campaigns').updateOne({ id: c.id }, { $set: c }, { upsert: true });
                }
            }
        }

        // 2. Migrate Master Contacts
        if (fs.existsSync(MASTER_CONTACTS_FILE)) {
            const contacts = JSON.parse(fs.readFileSync(MASTER_CONTACTS_FILE, 'utf8'));
            if (contacts.length > 0) {
                console.log(`Migrating ${contacts.length} master contacts...`);
                for (let c of contacts) {
                    if (c.email) {
                        c = sanitizeKeys(c);
                        const email = c.email.toLowerCase();
                        await db.collection('master_contacts').updateOne({ email: email }, { $set: { ...c, email: email } }, { upsert: true });
                    }
                }
            }
        }

        // 3. Migrate Templates
        if (fs.existsSync(TEMPLATES_FILE)) {
            const templates = JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf8'));
            if (templates.length > 0) {
                console.log(`Migrating ${templates.length} templates...`);
                for (let t of templates) {
                    t = sanitizeKeys(t);
                    await db.collection('templates').updateOne({ id: t.id }, { $set: t }, { upsert: true });
                }
            }
        }

        console.log("Migration completed successfully!");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.close();
    }
}

migrate();
