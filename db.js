const Datastore = require('nedb');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_DIR = process.env.DB_DIR || path.join(__dirname, 'data');
require('fs').mkdirSync(DB_DIR, { recursive: true });

const db = {
  users:        new Datastore({ filename: path.join(DB_DIR, 'users.db'),        autoload: true }),
  clients:      new Datastore({ filename: path.join(DB_DIR, 'clients.db'),      autoload: true }),
  portfolios:   new Datastore({ filename: path.join(DB_DIR, 'portfolios.db'),   autoload: true }),
  holdings:     new Datastore({ filename: path.join(DB_DIR, 'holdings.db'),     autoload: true }),
  transactions: new Datastore({ filename: path.join(DB_DIR, 'transactions.db'), autoload: true }),
  prices:       new Datastore({ filename: path.join(DB_DIR, 'prices.db'),       autoload: true }),
  benchmarks:   new Datastore({ filename: path.join(DB_DIR, 'benchmarks.db'),   autoload: true }),
  allocations:  new Datastore({ filename: path.join(DB_DIR, 'allocations.db'),  autoload: true }),
  alternatives: new Datastore({ filename: path.join(DB_DIR, 'alternatives.db'), autoload: true }),
  snapshots:    new Datastore({ filename: path.join(DB_DIR, 'snapshots.db'),    autoload: true }),
};

// Promisify helpers
db.find = (store, query) => new Promise((res, rej) => store.find(query, (e, d) => e ? rej(e) : res(d)));
db.findOne = (store, query) => new Promise((res, rej) => store.findOne(query, (e, d) => e ? rej(e) : res(d)));
db.insert = (store, doc) => new Promise((res, rej) => store.insert(doc, (e, d) => e ? rej(e) : res(d)));
db.update = (store, query, update, opts={}) => new Promise((res, rej) => store.update(query, update, opts, (e, n) => e ? rej(e) : res(n)));
db.remove = (store, query, opts={}) => new Promise((res, rej) => store.remove(query, opts, (e, n) => e ? rej(e) : res(n)));

// Seed default admin user
async function seedAdmin() {
  const existing = await db.findOne(db.users, { username: 'admin' });
  if (!existing) {
    const hash = await bcrypt.hash('admin123', 10);
    await db.insert(db.users, {
      username: 'admin',
      password: hash,
      name: 'Administrator',
      role: 'admin',
      createdAt: new Date()
    });
    console.log('✅ Default admin created: admin / admin123');
  }
}

seedAdmin();
module.exports = db;
