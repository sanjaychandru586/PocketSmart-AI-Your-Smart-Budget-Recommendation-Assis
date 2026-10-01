const categories = {
  Housing: { color: '#46764f', icon: '⌂', budget: 1400 }, Groceries: { color: '#9db789', icon: '▤', budget: 650 },
  Dining: { color: '#e5bd5e', icon: '♨', budget: 400 }, Transport: { color: '#cd785d', icon: '↗', budget: 300 },
  Shopping: { color: '#85a6b4', icon: '◇', budget: 350 }, Health: { color: '#aa8d9a', icon: '✚', budget: 250 },
  Entertainment: { color: '#8f9e65', icon: '♫', budget: 200 }, Utilities: { color: '#77918d', icon: 'ϟ', budget: 250 },
  Other: { color: '#a5a99c', icon: '·', budget: 400 }, Income: { color: '#6d9568', icon: '↙', budget: 0 },
};
const defaults = {
  budgets: Object.fromEntries(Object.entries(categories).filter(([name]) => name !== 'Income').map(([name, item]) => [name, item.budget])),
  transactions: [
    { id: 'a', description: 'Rent payment', category: 'Housing', amount: 1450, type: 'expense', date: '2026-10-01' },
    { id: 'b', description: 'Salary · Acme Studio', category: 'Income', amount: 4200, type: 'income', date: '2026-10-01' },
    { id: 'c', description: 'Fresh Market', category: 'Groceries', amount: 312.4, type: 'expense', date: '2026-10-01' },
    { id: 'd', description: 'Bluebird Coffee', category: 'Dining', amount: 8.75, type: 'expense', date: '2026-10-01' },
    { id: 'e', description: 'Metro pass', category: 'Transport', amount: 172.8, type: 'expense', date: '2026-10-01' },
    { id: 'f', description: 'Freelance project', category: 'Income', amount: 1040, type: 'income', date: '2026-10-01' },
    { id: 'g', description: 'Little Fern Books', category: 'Shopping', amount: 84.6, type: 'expense', date: '2026-10-01' },
    { id: 'h', description: 'Electricity bill', category: 'Utilities', amount: 103.4, type: 'expense', date: '2026-10-01' },
    { id: 'i', description: 'Dinner at Juniper', category: 'Dining', amount: 117.55, type: 'expense', date: '2026-10-01' },
    { id: 'j', description: 'Pharmacy', category: 'Health', amount: 150, type: 'expense', date: '2026-10-01' },
  ],
};
const storageKey = 'pocketsmart-state-v1';
const month = '2026-10';
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const shortMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const escapeHTML = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let state;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  state = saved && Array.isArray(saved.transactions) && saved.budgets ? saved : structuredClone(defaults);
} catch { state = structuredClone(defaults); }
let toastTimeout;
const total = (items) => items.reduce((value, item) => value + item.amount, 0);
const thisMonth = (type) => state.transactions.filter((item) => item.date.startsWith(month) && item.type === type);
const expenses = () => thisMonth('expense');
const income = () => thisMonth('income');
const budgetTotal = () => Object.values(state.budgets).reduce((value, amount) => value + Number(amount), 0);
const formatDate = (date) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`));
const localDateString = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const createTransactionId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function renderCategories(spent) {
  const totals = expenses().reduce((result, item) => { result[item.category] = (result[item.category] || 0) + item.amount; return result; }, {});
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const visible = sorted.slice(0, 5);
  const overflow = sorted.slice(5).reduce((value, item) => value + item[1], 0);
  if (overflow) visible.push(['Other', overflow]);
  let cursor = 0;
  const segments = visible.map(([name, amount]) => {
    const start = cursor;
    cursor += spent ? amount / spent * 100 : 0;
    return `${categories[name]?.color || categories.Other.color} ${start}% ${cursor}%`;
  });
  if (cursor < 100) segments.push(`#e9ece5 ${cursor}% 100%`);
  document.querySelector('#donut').style.background = `conic-gradient(${segments.join(',')})`;
  document.querySelector('#categories').innerHTML = visible.length ? visible.map(([name, amount]) => `<div class="category-item"><i class="category-dot" style="background:${categories[name]?.color || categories.Other.color}"></i><span class="category-name">${escapeHTML(name)}</span><strong class="category-value">${shortMoney.format(amount)}</strong></div>`).join('') : '<p class="empty">Add an expense to see your spending.</p>';
}

function transactionRow(item) {
  const config = categories[item.category] || categories.Other;
  const sign = item.type === 'income' ? '+' : '−';
  return `<tr><td><div class="transaction-name"><span class="transaction-icon">${config.icon}</span>${escapeHTML(item.description)}</div></td><td><span class="category-tag">${escapeHTML(item.category)}</span></td><td>${formatDate(item.date)}</td><td class="right ${item.type === 'income' ? 'amount-income' : 'amount-expense'}">${sign}${money.format(item.amount)}</td></tr>`;
}

function renderTransactions() {
  const sorted = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date));
  document.querySelector('#recent-rows').innerHTML = sorted.length ? sorted.slice(0, 5).map(transactionRow).join('') : '<tr><td class="empty" colspan="4">Your transactions will show up here.</td></tr>';
  const query = document.querySelector('#search').value.trim().toLowerCase();
  const filtered = sorted.filter((item) => `${item.description} ${item.category} ${item.type}`.toLowerCase().includes(query));
  document.querySelector('#all-rows').innerHTML = filtered.length ? filtered.map(transactionRow).join('') : '<tr><td class="empty" colspan="4">No transactions match your search.</td></tr>';
  document.querySelector('#transaction-count').textContent = `${filtered.length} transaction${filtered.length === 1 ? '' : 's'}${query ? ' found' : ' in your account'}`;
}

function renderBudgets(spent, limit) {
  const used = expenses().reduce((result, item) => { result[item.category] = (result[item.category] || 0) + item.amount; return result; }, {});
  const remaining = limit ? Math.max(0, Math.round((1 - spent / limit) * 100)) : 0;
  const percent = Math.min(100 - remaining, 100);
  document.querySelector('#budget-total').textContent = money.format(limit);
  document.querySelector('#budget-spent').textContent = `${money.format(spent)} spent`;
  document.querySelector('#remaining-percent').textContent = `${remaining}%`;
  document.querySelector('#budget-ring').style.background = `conic-gradient(#71956b 0 ${percent}%,#dfe8d9 ${percent}% 100%)`;
  document.querySelector('#budget-list').innerHTML = Object.entries(state.budgets).map(([name, cap]) => {
    const amount = used[name] || 0;
    const ratio = cap ? Math.round(amount / cap * 100) : 0;
    const status = ratio >= 100 ? 'over-limit' : ratio >= 80 ? 'near-limit' : '';
    return `<div class="budget-row"><div class="budget-category"><span class="transaction-icon">${categories[name]?.icon || categories.Other.icon}</span>${escapeHTML(name)}</div><div class="budget-track"><span class="${status}" style="width:${Math.min(ratio, 100)}%"></span></div><div class="budget-usage"><strong>${money.format(amount)}</strong> / ${money.format(Number(cap))}</div></div>`;
  }).join('');
}

function renderInsight() {
  const totals = expenses().reduce((result, item) => { result[item.category] = (result[item.category] || 0) + item.amount; return result; }, {});
  const dining = totals.Dining || 0;
  const highest = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  let insight = { icon: '✳', title: 'Make your first money move.', text: 'Add a transaction to give PocketSmart a clearer picture and get a recommendation tailored to your spending.' };
  if (dining) insight = { icon: '☕', title: 'A little less latte, a little more future.', text: `Your dining spending is ${money.format(dining)} this month. Two fewer coffees a week could free up <strong>${money.format(Math.min(48, dining * .2))}</strong> for your savings goal.` };
  else if (highest) insight = { icon: categories[highest[0]]?.icon || '◎', title: 'Your plan is working for you.', text: `${highest[0]} is your biggest expense at ${money.format(highest[1])} so far. There is still room in your budget to keep other priorities moving.` };
  document.querySelector('#insight-icon').textContent = insight.icon;
  document.querySelector('#insight-title').textContent = insight.title;
  document.querySelector('#insight-text').innerHTML = insight.text;
}

function render() {
  const spent = total(expenses());
  const earned = total(income());
  const limit = budgetTotal();
  document.querySelector('#balance').textContent = money.format(earned - spent);
  document.querySelector('#income-total').textContent = money.format(earned);
  document.querySelector('#spending-total').textContent = money.format(spent);
  document.querySelector('#monthly-budget').textContent = shortMoney.format(limit);
  document.querySelector('#spending-progress').style.width = `${Math.min(spent / (limit || 1) * 100, 100)}%`;
  document.querySelector('#donut-total').textContent = shortMoney.format(spent);
  renderCategories(spent);
  renderTransactions();
  renderInsight();
  renderBudgets(spent, limit);
}

function save() { localStorage.setItem(storageKey, JSON.stringify(state)); }
function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove('visible'), 2400);
}
function setView(name) {
  document.querySelectorAll('.page').forEach((page) => page.classList.toggle('hidden', page.id !== `${name}-view`));
  document.querySelectorAll('.nav-item').forEach((button) => {
    const active = button.dataset.view === name;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  document.querySelector('#breadcrumb').textContent = name[0].toUpperCase() + name.slice(1);
}

document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
document.querySelectorAll('[data-go]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.go)));
document.querySelectorAll('.add-button').forEach((button) => button.addEventListener('click', () => {
  document.querySelector('#transaction-date').value = localDateString();
  document.querySelector('#transaction-dialog').showModal();
}));
document.querySelectorAll('.close').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); }));
document.querySelector('#search').addEventListener('input', renderTransactions);
document.querySelector('#transaction-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state.transactions.push({ id: createTransactionId(), description: String(data.get('description')).trim(), category: String(data.get('category')), amount: Number(data.get('amount')), type: String(data.get('type')), date: String(data.get('date')) });
  save(); render(); event.currentTarget.reset(); document.querySelector('#transaction-dialog').close(); toast('Transaction saved. Your budget is up to date.');
});
document.querySelector('#edit-budgets').addEventListener('click', () => {
  document.querySelector('#budget-fields').innerHTML = Object.entries(state.budgets).map(([name, amount]) => `<label class="field">${escapeHTML(name)}<div class="amount"><span>$</span><input type="number" min="0" step="10" name="${escapeHTML(name)}" value="${Number(amount)}" required /></div></label>`).join('');
  document.querySelector('#budgets-dialog').showModal();
});
document.querySelector('#budgets-form').addEventListener('submit', (event) => {
  event.preventDefault();
  for (const [name, value] of new FormData(event.currentTarget)) state.budgets[name] = Number(value);
  save(); render(); document.querySelector('#budgets-dialog').close(); toast('Your monthly budgets have been updated.');
});
document.querySelector('#insight-action').addEventListener('click', () => setView('budgets'));
document.querySelector('#category-select').innerHTML = Object.keys(categories).filter((name) => name !== 'Income').map((name) => `<option>${name}</option>`).join('');
document.querySelector('#today').textContent = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());
render();