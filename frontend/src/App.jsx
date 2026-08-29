import { useEffect, useMemo, useState } from 'react';

const categoryColors = {
  Food: '#f59e0b',
  Transport: '#3b82f6',
  Shopping: '#8b5cf6',
  Travel: '#14b8a6',
  Entertainment: '#ec4899',
  Bills: '#ef4444',
  Health: '#10b981',
  Education: '#f97316',
  Others: '#64748b',
};

const NAV_ITEMS = ['dashboard', 'transactions', 'budgets', 'insights', 'reports'];
const STORAGE_KEY = 'expense_ai_token';
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const MODEL_BASE_URL = import.meta.env.VITE_MODEL_URL || 'http://localhost:8000';
const buildApiUrl = (path) => `${API_BASE_URL}${path}`;
const DEFAULT_FORM = {
  description: 'Starbucks - cappuccino',
  merchant: 'Starbucks',
  amount: '6.5',
  date: new Date().toISOString().slice(0, 10),
};

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));
}

function App() {
  const [page, setPage] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState({
    totalSpent: 0,
    totalTransactions: 0,
    topCategory: 'Food',
    topCategoryValue: 0,
    spendByCategory: [],
    monthlyTrend: [],
    budgetStatus: [],
  });
  const [insights, setInsights] = useState([]);
  const [status, setStatus] = useState('Ready');
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [prediction, setPrediction] = useState({ category: 'Food', confidence: 0.87 });
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({
    name: '',
    email: 'demo@expense.ai',
    password: 'demo123',
  });
  const [authError, setAuthError] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user?.name || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [profileMessage, setProfileMessage] = useState('');

  useEffect(() => {
    const currentPage = window.location.hash.replace('#', '') || 'dashboard';
    setPage(currentPage);

    const onHashChange = () => {
      setPage(window.location.hash.replace('#', '') || 'dashboard');
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const apiFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Request failed');
    }

    return response.status === 204 ? null : response.json();
  };

  useEffect(() => {
    const loadMyProfile = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const profile = await apiFetch('/api/auth/me');
        setUser(profile);
        setProfileForm({ name: profile.name || '' });
      } catch (error) {
        localStorage.removeItem(STORAGE_KEY);
        setToken('');
        setUser(null);
      }
    };

    loadMyProfile();
  }, [token]);

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name || '' });
    }
  }, [user]);

  const loadData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [transactionsRes, budgetsRes, summaryRes, insightsRes] = await Promise.all([
        apiFetch(buildApiUrl('/api/transactions')),
        apiFetch(buildApiUrl('/api/budgets')),
        apiFetch(buildApiUrl('/api/summary')),
        apiFetch(buildApiUrl('/api/insights')),
      ]);

      setTransactions(transactionsRes || []);
      setBudgets(budgetsRes || []);
      setSummary(summaryRes || {});
      setInsights(insightsRes || []);
    } catch (error) {
      setStatus('Backend unavailable');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const totalSpent = useMemo(
    () => transactions.reduce((sum, txn) => sum + Number(txn.amount), 0),
    [transactions]
  );

  const monthlyBars = useMemo(() => {
    const max = Math.max(...(summary.monthlyTrend || []).map((item) => Number(item.value || 0)), 1);
    return (summary.monthlyTrend || []).map((item) => ({
      ...item,
      height: `${Math.max((Number(item.value || 0) / max) * 100, 12)}%`,
    }));
  }, [summary.monthlyTrend]);

  const handleNavClick = (nextPage) => {
    window.location.hash = nextPage;
    setPage(nextPage);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleAuthFieldChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
  };

  const handleProfileFieldChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  const handlePasswordFieldChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  };

  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    setProfileMessage('');

    try {
      const updatedUser = await apiFetch(buildApiUrl('/api/auth/profile'), {
        method: 'PUT',
        body: JSON.stringify({ name: profileForm.name }),
      });

      setUser(updatedUser);
      setProfileMessage('Profile updated successfully');
      setStatus('Profile updated');
    } catch (error) {
      setProfileMessage(error.message || 'Unable to update profile');
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setProfileMessage('');

    try {
      await apiFetch(buildApiUrl('/api/auth/change-password'), {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      setPasswordForm({ currentPassword: '', newPassword: '' });
      setProfileMessage('Password updated successfully');
      setStatus('Password updated');
    } catch (error) {
      setProfileMessage(error.message || 'Unable to update password');
    }
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError('');

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = authMode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : { name: authForm.name, email: authForm.email, password: authForm.password };

      const response = await fetch(buildApiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      localStorage.setItem(STORAGE_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      setStatus('Logged in');
    } catch (error) {
      setAuthError(error.message || 'Unable to authenticate');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken('');
    setUser(null);
    setTransactions([]);
    setBudgets([]);
    setSummary({
      totalSpent: 0,
      totalTransactions: 0,
      topCategory: 'Food',
      topCategoryValue: 0,
      spendByCategory: [],
      monthlyTrend: [],
      budgetStatus: [],
    });
    setInsights([]);
    setPage('dashboard');
    window.location.hash = 'dashboard';
  };

  const handlePredict = async () => {
    setPredicting(true);
    setStatus('Predicting category...');

    try {
      const response = await fetch(`${MODEL_BASE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: form.description,
          amount: Number(form.amount || 0),
        }),
      });

      if (!response.ok) {
        throw new Error('Prediction service failed');
      }

      const result = await response.json();
      const category = result.category || 'Food';
      const confidence = Number(result.probabilities?.[category] || 0.8);
      setPrediction({ category, confidence });
      setStatus('AI prediction updated');
    } catch (error) {
      const text = (form.description || '').toLowerCase();
      const fallback = text.includes('uber')
        ? 'Transport'
        : text.includes('food') || text.includes('coffee') || text.includes('starbucks') || text.includes('pizza')
          ? 'Food'
          : text.includes('netflix') || text.includes('movie')
            ? 'Entertainment'
            : text.includes('flight') || text.includes('hotel') || text.includes('airline')
              ? 'Travel'
              : text.includes('amazon') || text.includes('shop')
                ? 'Shopping'
                : 'Bills';

      setPrediction({ category: fallback, confidence: 0.74 });
      setStatus('Fallback prediction used');
    } finally {
      setPredicting(false);
    }
  };

  const handleAddExpense = async (event) => {
    event.preventDefault();
    try {
      await apiFetch(buildApiUrl('/api/transactions'), {
        method: 'POST',
        body: JSON.stringify({
          description: form.description,
          merchant: form.merchant,
          amount: Number(form.amount || 0),
          category: prediction.category,
          date: form.date,
        }),
      });

      setStatus('Expense added successfully');
      setForm(DEFAULT_FORM);
      await loadData();
    } catch (error) {
      setStatus('Could not add expense');
      console.error(error);
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      await apiFetch(buildApiUrl(`/api/transactions/${id}`), { method: 'DELETE' });
      await loadData();
      setStatus('Transaction removed');
    } catch (error) {
      console.error(error);
    }
  };

  const handleBudgetUpdate = async (category, limit) => {
    try {
      await apiFetch(buildApiUrl(`/api/budgets/${category}`), {
        method: 'PUT',
        body: JSON.stringify({ limit: Number(limit) }),
      });
      await loadData();
      setStatus('Budget updated');
    } catch (error) {
      console.error(error);
    }
  };

  const handleExportReport = async () => {
    const link = document.createElement('a');
    link.href = buildApiUrl('/api/export/report');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
    setStatus('CSV report downloaded');
  };

  const renderProfileModal = () => (
    profileOpen && (
      <div className="modal-backdrop" onClick={() => setProfileOpen(false)}>
        <div className="profile-modal" onClick={(event) => event.stopPropagation()}>
          <div className="panel-header profile-header">
            <h2>Profile settings</h2>
            <button type="button" className="tiny-btn" onClick={() => setProfileOpen(false)}>Close</button>
          </div>

          <form className="auth-form" onSubmit={handleProfileUpdate}>
            <label>
              Full name
              <input name="name" value={profileForm.name} onChange={handleProfileFieldChange} />
            </label>
            <button type="submit" className="action-btn primary full">Save profile</button>
          </form>

          <form className="auth-form password-form" onSubmit={handlePasswordChange}>
            <label>
              Current password
              <input type="password" name="currentPassword" value={passwordForm.currentPassword} onChange={handlePasswordFieldChange} />
            </label>
            <label>
              New password
              <input type="password" name="newPassword" value={passwordForm.newPassword} onChange={handlePasswordFieldChange} />
            </label>
            <button type="submit" className="action-btn full">Update password</button>
          </form>

          {profileMessage && <div className="auth-error profile-message">{profileMessage}</div>}
        </div>
      </div>
    )
  );

  const renderAuthScreen = () => (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand auth-brand">
          <div className="brand-mark">AI</div>
          <div>
            <strong>Expense AI</strong>
            <small>Intelligence Platform</small>
          </div>
        </div>

        <h2>{authMode === 'login' ? 'Login to your account' : 'Create your account'}</h2>

        <form className="auth-form" onSubmit={handleAuthSubmit}>
          {authMode === 'register' && (
            <label>
              Full name
              <input name="name" value={authForm.name} onChange={handleAuthFieldChange} placeholder="Jane Doe" />
            </label>
          )}

          <label>
            Email
            <input type="email" name="email" value={authForm.email} onChange={handleAuthFieldChange} placeholder="you@example.com" />
          </label>

          <label>
            Password
            <input type="password" name="password" value={authForm.password} onChange={handleAuthFieldChange} placeholder="********" />
          </label>

          {authError && <div className="auth-error">{authError}</div>}

          <button type="submit" className="action-btn primary full">
            {authMode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>

        <button className="switch-btn" type="button" onClick={() => setAuthMode((current) => current === 'login' ? 'register' : 'login')}>
          {authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
        </button>

        <div className="demo-note">
          Demo account: demo@expense.ai / demo123
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Expense Intelligence Dashboard</h1>
        </div>
        <div className="header-actions">
          <span className="user-badge">{user ? user.name : 'User'}</span>
          <button className="action-btn" onClick={() => setProfileOpen(true)}>Profile</button>
          <button className="action-btn primary" onClick={handleExportReport}>Export report</button>
          <button className="action-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <section className="kpis">
        <div className="kpi-card">
          <span>Total spent</span>
          <h3>{formatCurrency(totalSpent)}</h3>
          <small>+12.4% vs last month</small>
        </div>
        <div className="kpi-card">
          <span>Saved this month</span>
          <h3>$1,240</h3>
          <small>+8.1% from budget</small>
        </div>
        <div className="kpi-card">
          <span>Top category</span>
          <h3>{summary.topCategory || 'Food'}</h3>
          <small>{formatCurrency(summary.topCategoryValue || 0)} spent</small>
        </div>
        <div className="kpi-card">
          <span>AI predictions</span>
          <h3>{Math.round((prediction.confidence || 0.8) * 100)}%</h3>
          <small>confidence</small>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Monthly spending</h2>
            <span>Aug 2026</span>
          </div>

          <div className="chart-columns">
            {monthlyBars.map((item) => (
              <div className="chart-bar-wrap" key={item.month}>
                <div className="chart-bar-label">{item.month}</div>
                <div className="chart-bar-stack">
                  <div
                    className="chart-bar"
                    style={{
                      height: item.height,
                      background: '#4f46e5',
                    }}
                  />
                </div>
                <div className="chart-base">{formatCurrency(item.value)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel prediction-panel">
          <div className="panel-header">
            <h2>AI category</h2>
            <span>{status}</span>
          </div>

          <div className="prediction-card">
            <div className="prediction-badge" style={{ background: categoryColors[prediction.category] || '#64748b' }}>
              {prediction.category}
            </div>
            <div className="confidence-row">
              <span>Confidence</span>
              <strong>{Math.round((prediction.confidence || 0.8) * 100)}%</strong>
            </div>
            <div className="meter">
              <span style={{ width: `${(prediction.confidence || 0.8) * 100}%` }} />
            </div>
            <button className="action-btn" onClick={handlePredict} disabled={predicting}>
              {predicting ? 'Checking...' : 'Predict category'}
            </button>
          </div>
        </div>
      </section>

      <section className="lower-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Add expense</h2>
            <span>Quick entry</span>
          </div>

          <form className="expense-form" onSubmit={handleAddExpense}>
            <label>
              Description
              <input name="description" value={form.description} onChange={handleInputChange} />
            </label>
            <label>
              Merchant
              <input name="merchant" value={form.merchant} onChange={handleInputChange} />
            </label>
            <div className="two-col">
              <label>
                Amount
                <input name="amount" type="number" step="0.01" value={form.amount} onChange={handleInputChange} />
              </label>
              <label>
                Date
                <input name="date" type="date" value={form.date} onChange={handleInputChange} />
              </label>
            </div>
            <div className="suggestion-box">
              <span>Suggested category</span>
              <strong>{prediction.category}</strong>
            </div>
            <button className="action-btn primary full" type="submit">Save expense</button>
          </form>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Smart insights</h2>
            <span>AI generated</span>
          </div>

          <ul className="insights-list">
            {(insights.length ? insights : [{ text: 'You spent 30% more on food this month.', type: 'Food' }, { text: 'Travel expenses increased significantly this week.', type: 'Travel' }]).map((item, index) => (
              <li key={`${item.type}-${index}`}>
                <span className={`dot ${item.type.toLowerCase()}`}></span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );

  const renderTransactionsPage = () => (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Transactions</p>
          <h1>Expense Ledger</h1>
        </div>
        <div className="header-actions">
          <button className="action-btn" onClick={() => setProfileOpen(true)}>Profile</button>
          <button className="action-btn primary" onClick={handleExportReport}>Export CSV</button>
          <button className="action-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="panel full-panel">
        <div className="panel-header">
          <h2>Recent transactions</h2>
          <span>{transactions.length} entries</span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Merchant</th>
                <th>Description</th>
                <th>Category</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <tr key={txn.id}>
                  <td>{txn.merchant}</td>
                  <td>{txn.description}</td>
                  <td>
                    <span
                      className="category-pill"
                      style={{ background: `${categoryColors[txn.category] || '#64748b'}22`, color: categoryColors[txn.category] || '#64748b' }}
                    >
                      {txn.category}
                    </span>
                  </td>
                  <td>{txn.date}</td>
                  <td>{formatCurrency(txn.amount)}</td>
                  <td>
                    <button className="tiny-btn danger" onClick={() => handleDeleteTransaction(txn.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderBudgetsPage = () => (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Budgets</p>
          <h1>Budget Planner</h1>
        </div>
        <div className="header-actions">
          <button className="action-btn" onClick={() => setProfileOpen(true)}>Profile</button>
          <button className="action-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="budget-grid">
        {(budgets.length ? budgets : [{ category: 'Food', limit: 350, spent: 0 }]).map((budget) => {
          const percentage = Math.min(100, ((budget.spent || 0) / Math.max(budget.limit || 1, 1)) * 100);
          return (
            <div className="panel budget-card" key={budget.category}>
              <div className="panel-header">
                <h2>{budget.category}</h2>
                <span>{Math.round(percentage)}%</span>
              </div>

              <div className="budget-line">
                <strong>{formatCurrency(budget.spent || 0)}</strong>
                <span>of {formatCurrency(budget.limit || 0)}</span>
              </div>

              <div className="meter budget-meter">
                <span style={{ width: `${percentage}%`, background: categoryColors[budget.category] || '#4f46e5' }} />
              </div>

              <label className="budget-input-wrap">
                Monthly limit
                <input
                  type="number"
                  min="0"
                  step="10"
                  defaultValue={budget.limit || 0}
                  onBlur={(event) => handleBudgetUpdate(budget.category, event.target.value)}
                />
              </label>
            </div>
          );
        })}
      </div>
    </>
  );

  const renderInsightsPage = () => (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Insights</p>
          <h1>Smart Financial Insights</h1>
        </div>
        <div className="header-actions">
          <button className="action-btn" onClick={() => setProfileOpen(true)}>Profile</button>
          <button className="action-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="panel full-panel">
        <ul className="insights-list large-list">
          {(insights.length ? insights : [{ text: 'You spent 30% more on food this month.', type: 'Food' }]).map((item, index) => (
            <li key={`${item.type}-${index}`}>
              <span className={`dot ${item.type.toLowerCase()}`}></span>
              {item.text}
            </li>
          ))}
        </ul>
      </div>
    </>
  );

  const renderReportsPage = () => (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Reports</p>
          <h1>Expense Reports</h1>
        </div>
        <div className="header-actions">
          <button className="action-btn" onClick={() => setProfileOpen(true)}>Profile</button>
          <button className="action-btn primary" onClick={handleExportReport}>Download CSV</button>
          <button className="action-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="panel full-panel">
        <div className="summary-box">
          <div>
            <span>Total spend</span>
            <h3>{formatCurrency(totalSpent)}</h3>
          </div>
          <div>
            <span>Transactions</span>
            <h3>{transactions.length}</h3>
          </div>
          <div>
            <span>Budget used</span>
            <h3>{Math.round(((budgets.reduce((sum, item) => sum + (item.spent || 0), 0) / Math.max(budgets.reduce((sum, item) => sum + (item.limit || 0), 0), 1)) * 100) || 0)}%</h3>
          </div>
        </div>

        <div className="report-list">
          {(summary.spendByCategory || []).map((item) => (
            <div className="report-item" key={item.category}>
              <span>{item.category}</span>
              <strong>{formatCurrency(item.value)}</strong>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  if (!token) {
    return renderAuthScreen();
  }

  if (loading) {
    return <div className="loading-wrap">Loading your expense dashboard...</div>;
  }

  return (
    <>
      {renderProfileModal()}
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">AI</div>
            <div>
              <strong>Expense AI</strong>
              <small>Intelligence Platform</small>
            </div>
          </div>

          <nav className="nav">
            {NAV_ITEMS.map((item) => (
              <a
                key={item}
                href={`#${item}`}
                className={page === item ? 'active' : ''}
                onClick={(event) => {
                  event.preventDefault();
                  handleNavClick(item);
                }}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </a>
            ))}
          </nav>

          <div className="mini-card">
            <span>AI Status</span>
            <strong>Model online</strong>
            <small>{user ? user.email : 'user@expense.ai'}</small>
            <button type="button" className="mini-link" onClick={() => setProfileOpen(true)}>Manage profile</button>
          </div>
        </aside>

        <main className="main-panel">
          {page === 'dashboard' && renderDashboard()}
          {page === 'transactions' && renderTransactionsPage()}
          {page === 'budgets' && renderBudgetsPage()}
          {page === 'insights' && renderInsightsPage()}
          {page === 'reports' && renderReportsPage()}
        </main>
      </div>
    </>
  );
}

export default App;
