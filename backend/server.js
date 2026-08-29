const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectDB } = require('./db');
const { User, Transaction, Budget } = require('./models');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'expense-ai-dev-secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:4173'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));


const defaultCategories = [
  'Food',
  'Transport',
  'Shopping',
  'Travel',
  'Entertainment',
  'Bills',
  'Health',
  'Education',
];

app.use(express.json());

function getTokenFromHeader(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

function requireAuth(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

async function ensureUserWithSeedData(userId) {
  const existingBudgets = await Budget.find({ userId }).countDocuments();
  if (existingBudgets === 0) {
    await Budget.insertMany(
      defaultCategories.map((category) => ({
        userId,
        category,
        limit: {
          Food: 350,
          Transport: 220,
          Shopping: 400,
          Travel: 500,
          Entertainment: 180,
          Bills: 300,
          Health: 160,
          Education: 200,
        }[category] || 200,
      }))
    );
  }

  const existingTransactions = await Transaction.find({ userId }).countDocuments();
  if (existingTransactions === 0) {
    const demoTxns = [
      { userId, merchant: 'Starbucks', description: 'Cappuccino and pastry', amount: 8.5, category: 'Food', date: '2026-08-15' },
      { userId, merchant: 'Uber', description: 'Ride to downtown', amount: 24.3, category: 'Transport', date: '2026-08-16' },
      { userId, merchant: 'Amazon', description: 'Wireless earbuds', amount: 69.99, category: 'Shopping', date: '2026-08-18' },
      { userId, merchant: 'Delta', description: 'Flight to Chicago', amount: 321.0, category: 'Travel', date: '2026-08-20' },
      { userId, merchant: 'Netflix', description: 'Monthly subscription', amount: 15.99, category: 'Entertainment', date: '2026-08-21' },
      { userId, merchant: 'City Power', description: 'Electricity bill', amount: 88.4, category: 'Bills', date: '2026-08-24' },
      { userId, merchant: 'Whole Foods', description: 'Groceries and fruit', amount: 56.3, category: 'Food', date: '2026-08-27' },
      { userId, merchant: 'Office Depot', description: 'Desk accessories', amount: 42.0, category: 'Shopping', date: '2026-08-28' },
    ];

    await Transaction.insertMany(demoTxns);
  }
}

async function seedData() {
  const demoEmail = 'demo@expense.ai';
  const demoUser = await User.findOne({ email: demoEmail.toLowerCase() });

  if (!demoUser) {
    const passwordHash = await bcrypt.hash('demo123', 10);
    const user = await User.create({
      name: 'Demo User',
      email: demoEmail,
      passwordHash,
    });

    await ensureUserWithSeedData(user._id);
  }
}

async function getSummaryPayload(userId) {
  const transactions = await Transaction.find({ userId }).sort({ date: -1, createdAt: -1 }).lean();
  const budgets = await Budget.find({ userId }).lean();
  const totalSpent = transactions.reduce((sum, txn) => sum + Number(txn.amount), 0);
  const byCategory = {};

  transactions.forEach((txn) => {
    byCategory[txn.category] = (byCategory[txn.category] || 0) + Number(txn.amount);
  });

  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0] || ['Food', 0];
  const budgetStatus = budgets.map((item) => {
    const spent = transactions
      .filter((txn) => txn.category === item.category)
      .reduce((sum, txn) => sum + Number(txn.amount), 0);

    return {
      category: item.category,
      limit: item.limit,
      spent,
      remaining: item.limit - spent,
      percent: Math.min(100, (spent / item.limit) * 100),
    };
  });

  return {
    totalSpent,
    totalTransactions: transactions.length,
    topCategory: topCategory[0],
    topCategoryValue: topCategory[1],
    spendByCategory: Object.entries(byCategory).map(([category, value]) => ({ category, value })),
    monthlyTrend: [
      { month: 'Jan', value: 420 },
      { month: 'Feb', value: 380 },
      { month: 'Mar', value: 460 },
      { month: 'Apr', value: 510 },
      { month: 'May', value: 470 },
      { month: 'Jun', value: 620 },
      { month: 'Jul', value: 600 },
      { month: 'Aug', value: totalSpent },
    ],
    budgetStatus,
  };
}

async function getInsightsPayload(userId) {
  const transactions = await Transaction.find({ userId }).lean();
  const totalSpent = transactions.reduce((sum, txn) => sum + Number(txn.amount), 0);
  return [
    { text: 'You spent 30% more on food this month.', type: 'Food' },
    { text: 'Travel expenses increased significantly this week.', type: 'Travel' },
    { text: `You are ${((totalSpent / 1000) * 12).toFixed(0)}% above your projected monthly spend.`, type: 'Bills' },
  ];
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ message: 'A user with that email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email: normalizedEmail, passwordHash });
  await ensureUserWithSeedData(user._id);

  const token = jwt.sign({ userId: user._id.toString(), name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  return res.status(201).json({ token, user: { id: user._id.toString(), name: user.name, email: user.email } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email: String(email).trim().toLowerCase() });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  await ensureUserWithSeedData(user._id);

  const token = jwt.sign({ userId: user._id.toString(), name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token, user: { id: user._id.toString(), name: user.name, email: user.email } });
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.userId).lean();
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json({ id: user._id.toString(), name: user.name, email: user.email });
});

app.put('/api/auth/profile', requireAuth, async (req, res) => {
  const { name } = req.body || {};
  const trimmedName = String(name || '').trim();

  if (!trimmedName) {
    return res.status(400).json({ message: 'Name is required' });
  }

  const user = await User.findById(req.user.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.name = trimmedName;
  await user.save();

  return res.json({ id: user._id.toString(), name: user.name, email: user.email });
});

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters long' });
  }

  const user = await User.findById(req.user.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  return res.json({ message: 'Password updated successfully' });
});

app.get('/api/summary', requireAuth, async (req, res) => {
  res.json(await getSummaryPayload(req.user.userId));
});

app.get('/api/insights', requireAuth, async (req, res) => {
  res.json(await getInsightsPayload(req.user.userId));
});

app.get('/api/transactions', requireAuth, async (req, res) => {
  const transactions = await Transaction.find({ userId: req.user.userId }).sort({ date: -1, createdAt: -1 }).lean();
  res.json(transactions.map((txn) => ({ ...txn, id: txn._id.toString() })));
});

app.post('/api/transactions', requireAuth, async (req, res) => {
  const { description, merchant, amount, category, date } = req.body || {};

  if (!description || !amount || !category) {
    return res.status(400).json({ message: 'Description, amount and category are required' });
  }

  const entry = await Transaction.create({
    userId: req.user.userId,
    description,
    merchant: merchant || 'Unknown Merchant',
    amount: Number(amount),
    category,
    date: date || new Date().toISOString().split('T')[0],
  });

  return res.status(201).json({
    ...entry.toObject(),
    id: entry._id.toString(),
  });
});

app.put('/api/transactions/:id', requireAuth, async (req, res) => {
  const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.userId });
  if (!transaction) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  const updated = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true });
  return res.json({ ...updated.toObject(), id: updated._id.toString() });
});

app.delete('/api/transactions/:id', requireAuth, async (req, res) => {
  const deleted = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
  if (!deleted) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  return res.json({ deleted: true, transaction: { ...deleted.toObject(), id: deleted._id.toString() } });
});

app.get('/api/budgets', requireAuth, async (req, res) => {
  const budgets = await Budget.find({ userId: req.user.userId }).lean();
  const transactions = await Transaction.find({ userId: req.user.userId }).lean();

  const response = budgets.map((budget) => {
    const spent = transactions
      .filter((txn) => txn.category === budget.category)
      .reduce((sum, txn) => sum + Number(txn.amount), 0);

    return {
      ...budget,
      id: budget._id.toString(),
      spent,
    };
  });

  res.json(response);
});

app.put('/api/budgets/:category', requireAuth, async (req, res) => {
  const { limit } = req.body || {};
  const target = await Budget.findOne({ userId: req.user.userId, category: { $regex: new RegExp(`^${req.params.category}$`, 'i') } });

  if (!target) {
    return res.status(404).json({ message: 'Budget category not found' });
  }

  target.limit = Number(limit) || target.limit;
  await target.save();

  return res.json({
    ...target.toObject(),
    id: target._id.toString(),
  });
});

app.get('/api/export/report', requireAuth, async (req, res) => {
  const transactions = await Transaction.find({ userId: req.user.userId }).sort({ date: -1, createdAt: -1 }).lean();
  const csvRows = [
    ['id', 'merchant', 'description', 'amount', 'category', 'date'],
    ...transactions.map((txn) => [txn._id.toString(), txn.merchant, txn.description, txn.amount, txn.category, txn.date]),
  ];

  const csv = csvRows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  res.header('Content-Type', 'text/csv');
  res.header('Content-Disposition', 'attachment; filename="expense-report.csv"');
  res.send(csv);
});

async function startServer() {
  await connectDB();
  await seedData();

  app.listen(PORT, () => {
    console.log(`Express backend running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
