import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from './index.js';
import { SQL } from './schema.js';

const GBP_CATEGORIES = [
  { name: 'Restaurant',               industry: 'Restaurant & Food' },
  { name: 'Fast Food Restaurant',     industry: 'Restaurant & Food' },
  { name: 'Cafe',                     industry: 'Restaurant & Food' },
  { name: 'Bakery',                   industry: 'Bakery' },
  { name: 'Catering Service',         industry: 'Catering' },
  { name: 'Medical Clinic',           industry: 'Clinic' },
  { name: 'Dental Clinic',            industry: 'Dental' },
  { name: 'Hospital',                 industry: 'Hospital' },
  { name: 'Diagnostic Centre',        industry: 'Diagnostic Centre' },
  { name: 'Pathology Laboratory',     industry: 'Pathology Lab' },
  { name: 'Physiotherapy Centre',     industry: 'Physiotherapy' },
  { name: 'Eye Care Centre',          industry: 'Eye Care' },
  { name: 'Skin Clinic',              industry: 'Skin Clinic' },
  { name: 'Pharmacy',                 industry: 'Pharmacy' },
  { name: 'Hair Salon',               industry: 'Hair Salon' },
  { name: 'Beauty Salon',             industry: 'Beauty' },
  { name: 'Spa',                      industry: 'Beauty' },
  { name: 'Nail Salon',               industry: 'Beauty' },
  { name: 'Gym',                      industry: 'Gym' },
  { name: 'Fitness Centre',           industry: 'Gym' },
  { name: 'Real Estate Agency',       industry: 'Real Estate' },
  { name: 'Property Developer',       industry: 'Real Estate' },
  { name: 'Interior Designer',        industry: 'Interior Design' },
  { name: 'Furniture Store',          industry: 'Furniture' },
  { name: 'Home Decor Store',         industry: 'Furniture' },
  { name: 'Car Dealership',           industry: 'Automotive' },
  { name: 'Auto Repair Shop',         industry: 'Automotive' },
  { name: 'Car Wash',                 industry: 'Automotive' },
  { name: 'Retail Store',             industry: 'Retail' },
  { name: 'Clothing Store',           industry: 'Clothing' },
  { name: 'Jewellery Store',          industry: 'Jewellery' },
  { name: 'Optical Store',            industry: 'Optical' },
  { name: 'Electronics Store',        industry: 'Electronics' },
  { name: 'Hardware Store',           industry: 'Hardware Store' },
  { name: 'Stationery Store',         industry: 'Stationery' },
  { name: 'Pet Shop',                 industry: 'Pet Shop' },
  { name: 'School',                   industry: 'Education' },
  { name: 'Coaching Centre',          industry: 'Coaching' },
  { name: 'Tutoring Service',         industry: 'Coaching' },
  { name: 'Driving School',           industry: 'Education' },
  { name: 'Law Firm',                 industry: 'Legal' },
  { name: 'Advocate',                 industry: 'Advocate' },
  { name: 'Chartered Accountant',     industry: 'Chartered Accountant' },
  { name: 'Financial Advisor',        industry: 'Chartered Accountant' },
  { name: 'Hotel',                    industry: 'Hotels' },
  { name: 'Guest House',              industry: 'Hotels' },
  { name: 'Travel Agency',            industry: 'Travel Agent' },
  { name: 'Tour Operator',            industry: 'Travel Agent' },
  { name: 'Photography Studio',       industry: 'Photography' },
  { name: 'Event Management',         industry: 'Events' },
  { name: 'Wedding Planner',          industry: 'Wedding Planner' },
  { name: 'Banquet Hall',             industry: 'Events' },
  { name: 'Pest Control Service',     industry: 'Pest Control' },
  { name: 'Security Services',        industry: 'Security Services' },
  { name: 'Solar Energy Company',     industry: 'Solar Energy' },
  { name: 'Logistics Company',        industry: 'Logistics' },
  { name: 'Printing Service',         industry: 'Printing' },
  { name: 'Packaging Company',        industry: 'Packaging' },
  { name: 'Digital Marketing Agency', industry: 'Retail' },
  { name: 'IT Services',              industry: 'Electronics' },
];

export async function initDb() {
  db.exec(SQL);

  // Migrations for existing DBs (ALTER TABLE is a no-op if column exists)
  const migrations = [
    'ALTER TABLE clients ADD COLUMN place_name_on_maps TEXT',
    'ALTER TABLE clients ADD COLUMN maps_rating REAL',
    'ALTER TABLE clients ADD COLUMN maps_review_count INTEGER DEFAULT 0',
    'ALTER TABLE clients ADD COLUMN maps_category_on_google TEXT',
    'ALTER TABLE clients ADD COLUMN maps_phone_on_google TEXT',
    'ALTER TABLE clients ADD COLUMN maps_website_on_google TEXT',
    'ALTER TABLE clients ADD COLUMN gbp_description_current TEXT',
    'ALTER TABLE clients ADD COLUMN gbp_status TEXT',
    'ALTER TABLE clients ADD COLUMN gbp_description_ai TEXT',
    // Keywords enrichment columns
    'ALTER TABLE keywords ADD COLUMN intent TEXT',
    'ALTER TABLE keywords ADD COLUMN priority TEXT',
    'ALTER TABLE keywords ADD COLUMN ai_reason TEXT',
    'ALTER TABLE keywords ADD COLUMN selected INTEGER DEFAULT 0',
    // Posts enrichment columns
    'ALTER TABLE gbp_posts ADD COLUMN image_prompt TEXT',
    // Strategy & content fields on clients
    'ALTER TABLE clients ADD COLUMN business_type TEXT',
    'ALTER TABLE clients ADD COLUMN services TEXT',
    'ALTER TABLE clients ADD COLUMN usp TEXT',
    'ALTER TABLE clients ADD COLUMN products TEXT',
    'ALTER TABLE clients ADD COLUMN target_audience TEXT',
    'ALTER TABLE clients ADD COLUMN target_areas TEXT',
    'ALTER TABLE clients ADD COLUMN brand_tone TEXT DEFAULT \'professional\'',
    'ALTER TABLE clients ADD COLUMN language_preference TEXT DEFAULT \'English\'',
    'ALTER TABLE clients ADD COLUMN monthly_objective TEXT',
    'ALTER TABLE clients ADD COLUMN gbp_ai_profile TEXT',
    // Billing extra fields
    'ALTER TABLE client_billing ADD COLUMN start_date TEXT',
    // Client logo
    'ALTER TABLE clients ADD COLUMN logo_url TEXT',
    // Keyword source
    "ALTER TABLE keywords ADD COLUMN source TEXT DEFAULT 'ai'",
    // Public share token
    'ALTER TABLE clients ADD COLUMN public_token TEXT',
  ];
  for (const sql of migrations) {
    try { db.prepare(sql).run(); } catch { /* column already exists */ }
  }

  const existingAdmin = db.prepare("SELECT id FROM users WHERE email = ?").get('admin@ampwake.com');
  if (!existingAdmin) {
    const hash = await bcrypt.hash('Ampwake@2525', 12);
    db.prepare(
      "INSERT INTO users (id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, 'admin', 'active')"
    ).run(uuidv4(), 'Admin', 'admin@ampwake.com', hash);
    console.log('Admin user seeded: admin@ampwake.com');
  }

  const insertCat = db.prepare('INSERT OR IGNORE INTO gbp_categories (id, name, industry) VALUES (?, ?, ?)');
  const seedCats = db.transaction(cats => { for (const c of cats) insertCat.run(uuidv4(), c.name, c.industry); });
  seedCats(GBP_CATEGORIES);
  console.log(`GBP categories seeded: ${GBP_CATEGORIES.length}`);

  console.log('Database initialized successfully');
}

if (process.argv[1] && process.argv[1].includes('init.js')) {
  initDb().catch(err => { console.error(err); process.exit(1); });
}
