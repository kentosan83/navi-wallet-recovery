const state = { connected: false, address: null, balance: null, ethPriceUsd: null, assets: [], chainId: null, user: null };
let authMode = 'login';
let balanceRefreshTimer = null;
const $ = (selector) => document.querySelector(selector);
const translations = {
  en: { greeting: 'Hello', overview: 'Overview', activity: 'Activity', wallets: 'Wallets', team: 'Team access', settings: 'Settings', workspace: 'Personal workspace', connect: 'Connect wallet', secure: 'Secure, view-only access.', balance: 'Total balance', connected: 'Wallets connected', network: 'Network', assets: 'Your assets', live: 'LIVE', deposit: 'Deposit', withdraw: 'Withdraw', add: 'Add another wallet', account: 'Account' },
  es: { greeting: 'Hola', overview: 'Resumen', activity: 'Actividad', wallets: 'Billeteras', team: 'Acceso del equipo', settings: 'Configuración', workspace: 'Espacio personal', connect: 'Conectar billetera', secure: 'Acceso seguro y de solo lectura.', balance: 'Saldo total', connected: 'Billeteras conectadas', network: 'Red', assets: 'Tus activos', live: 'EN VIVO', deposit: 'Depositar', withdraw: 'Retirar', add: 'Agregar otra billetera', account: 'Cuenta' },
  fr: { greeting: 'Bonjour', overview: 'Aperçu', activity: 'Activité', wallets: 'Portefeuilles', team: 'Accès équipe', settings: 'Paramètres', workspace: 'Espace personnel', connect: 'Connecter le portefeuille', secure: 'Accès sécurisé en lecture seule.', balance: 'Solde total', connected: 'Portefeuilles connectés', network: 'Réseau', assets: 'Vos actifs', live: 'EN DIRECT', deposit: 'Déposer', withdraw: 'Retirer', add: 'Ajouter un portefeuille', account: 'Compte' },
  de: { greeting: 'Hallo', overview: 'Übersicht', activity: 'Aktivität', wallets: 'Wallets', team: 'Teamzugriff', settings: 'Einstellungen', workspace: 'Persönlicher Bereich', connect: 'Wallet verbinden', secure: 'Sicherer Nur-Lese-Zugriff.', balance: 'Gesamtsaldo', connected: 'Verbundene Wallets', network: 'Netzwerk', assets: 'Ihre Assets', live: 'LIVE', deposit: 'Einzahlen', withdraw: 'Auszahlen', add: 'Wallet hinzufügen', account: 'Konto' },
  pt: { greeting: 'Olá', overview: 'Visão geral', activity: 'Atividade', wallets: 'Carteiras', team: 'Acesso da equipe', settings: 'Configurações', workspace: 'Espaço pessoal', connect: 'Conectar carteira', secure: 'Acesso seguro somente leitura.', balance: 'Saldo total', connected: 'Carteiras conectadas', network: 'Rede', assets: 'Seus ativos', live: 'AO VIVO', deposit: 'Depositar', withdraw: 'Sacar', add: 'Adicionar carteira', account: 'Conta' },
  ar: { greeting: 'مرحباً', overview: 'نظرة عامة', activity: 'النشاط', wallets: 'المحافظ', team: 'وصول الفريق', settings: 'الإعدادات', workspace: 'مساحة شخصية', connect: 'ربط المحفظة', secure: 'وصول آمن للعرض فقط.', balance: 'الرصيد الإجمالي', connected: 'المحافظ المتصلة', network: 'الشبكة', assets: 'أصولك', live: 'مباشر', deposit: 'إيداع', withdraw: 'سحب', add: 'إضافة محفظة', account: 'الحساب' },
  hi: { greeting: 'नमस्ते', overview: 'अवलोकन', activity: 'गतिविधि', wallets: 'वॉलेट', team: 'टीम एक्सेस', settings: 'सेटिंग्स', workspace: 'व्यक्तिगत कार्यक्षेत्र', connect: 'वॉलेट कनेक्ट करें', secure: 'सुरक्षित, केवल देखने की सुविधा।', balance: 'कुल शेष', connected: 'कनेक्टेड वॉलेट', network: 'नेटवर्क', assets: 'आपकी संपत्तियां', live: 'लाइव', deposit: 'जमा करें', withdraw: 'निकालें', add: 'वॉलेट जोड़ें', account: 'खाता' },
  zh: { greeting: '你好', overview: '概览', activity: '活动', wallets: '钱包', team: '团队访问', settings: '设置', workspace: '个人工作区', connect: '连接钱包', secure: '安全的只读访问。', balance: '总余额', connected: '已连接钱包', network: '网络', assets: '您的资产', live: '实时', deposit: '存入', withdraw: '提取', add: '添加钱包', account: '账户' },
  ja: { greeting: 'こんにちは', overview: '概要', activity: 'アクティビティ', wallets: 'ウォレット', team: 'チームアクセス', settings: '設定', workspace: '個人ワークスペース', connect: 'ウォレットを接続', secure: '安全な閲覧専用アクセス。', balance: '合計残高', connected: '接続済みウォレット', network: 'ネットワーク', assets: 'あなたの資産', live: 'ライブ', deposit: '入金', withdraw: '出金', add: 'ウォレットを追加', account: 'アカウント' },
  ko: { greeting: '안녕하세요', overview: '개요', activity: '활동', wallets: '지갑', team: '팀 액세스', settings: '설정', workspace: '개인 작업 공간', connect: '지갑 연결', secure: '안전한 읽기 전용 액세스.', balance: '총 잔액', connected: '연결된 지갑', network: '네트워크', assets: '내 자산', live: '실시간', deposit: '입금', withdraw: '출금', add: '지갑 추가', account: '계정' },
};
let language = localStorage.getItem('navi-language') || 'en';
const t = (key) => (translations[language] || translations.en)[key] || translations.en[key] || key;
function applyLanguage() {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  const select = $('#language-select');
  if (select) select.value = language;
  document.querySelector('.workspace-switcher span:nth-child(2)').textContent = t('workspace');
  document.querySelector('.breadcrumb span').textContent = t('workspace');
  document.querySelectorAll('.nav-item').forEach((item) => { const key = item.dataset.view; item.lastChild.textContent = t(key); });
  $('#connect-label').textContent = state.connected ? shortenAddress(state.address) : t('connect');
  document.querySelector('.page-heading h1').firstChild.textContent = `${t('greeting')}, `;
  $('#account-button').textContent = state.user?.fullName ? firstName(state.user.fullName) : t('account');
  document.querySelector('.notice strong').textContent = t('secure');
  document.querySelector('.card-label').textContent = t('balance');
  document.querySelectorAll('.card-label')[1].textContent = t('connected');
  document.querySelectorAll('.card-label')[2].textContent = t('network');
  document.querySelector('.assets-panel h2').textContent = t('assets');
  document.querySelector('.asset-live').textContent = t('live');
  $('#deposit-action strong').textContent = t('deposit');
  $('#withdraw-action strong').textContent = t('withdraw');
  $('#add-wallet strong').textContent = t('add');
}
$('#language-select')?.addEventListener('change', (event) => {
  language = event.target.value;
  localStorage.setItem('navi-language', language);
  applyLanguage();
  renderWallet();
});
const toast = (message) => {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('show');
  window.setTimeout(() => node.classList.remove('show'), 3200);
};
const shortenAddress = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`;
const firstName = (fullName) => (fullName || '').trim().split(/\s+/)[0] || 'there';
const initials = (fullName) => (fullName || 'Customer').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const formatEth = (hexBalance) => {
  const wei = BigInt(hexBalance);
  const whole = wei / 1000000000000000000n;
  const decimal = (wei % 1000000000000000000n).toString().padStart(18, '0').replace(/0+$/, '');
  return decimal ? `${whole}.${decimal}` : `${whole}`;
};
const getProvider = () => window.ethereum;
const balanceUrl = () => `/api/balance?address=${encodeURIComponent(state.address)}&chainId=${encodeURIComponent(state.chainId)}`;
const formatUsd = (hexBalance, price) => {
  const eth = Number(BigInt(hexBalance)) / 1e18;
  return (eth * price).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};
const formatToken = (value, decimals) => {
  const amount = Number(BigInt(value)) / (10 ** decimals);
  return amount.toLocaleString('en-US', { maximumFractionDigits: 8 });
};
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

async function refreshEthPrice() {
  const response = await fetch('/api/eth-price', { cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'ETH price lookup failed.');
  state.ethPriceUsd = result.usd;
}

async function refreshAssets() {
  if (!state.connected || !state.address || !state.chainId) return;
  const response = await fetch(`/api/assets?address=${encodeURIComponent(state.address)}&chainId=${encodeURIComponent(state.chainId)}`, { cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Token lookup failed.');
  state.assets = result.assets || [];
  renderAssets();
}

async function refreshBalance(showError = false) {
  if (!state.connected || !state.address || !state.chainId) return;
  try {
    let balance;
    if (getProvider() && state.chainId === await getProvider().request({ method: 'eth_chainId' })) {
      balance = await getProvider().request({ method: 'eth_getBalance', params: [state.address, 'latest'] });
    } else {
      const response = await fetch(balanceUrl(), { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Balance lookup failed.');
      balance = result.balance;
    }
    state.balance = balance;
    await refreshEthPrice();
    await refreshAssets();
    renderWallet();
  } catch (error) {
    if (showError) toast(`Balance refresh failed: ${error.message}`);
  }
}

function startBalanceRefresh() {
  window.clearInterval(balanceRefreshTimer);
  balanceRefreshTimer = window.setInterval(() => refreshBalance(), 15000);
}

fetch('/api/me', { cache: 'no-store' }).then(async (response) => {
  if (!response.ok) window.location.replace('/landing.html');
  else {
    state.user = await response.json();
    $('#customer-first-name').textContent = firstName(state.user.fullName);
    document.querySelector('.avatar').textContent = initials(state.user.fullName);
    document.querySelector('.user-card strong').textContent = state.user.fullName || 'Customer';
    showAuthenticatedHeader();
  }
}).catch(() => {});

async function connectWallet() {
  const provider = getProvider();
  if (!provider) {
    $('#wallet-modal').classList.remove('hidden');
    $('#manual-address').focus();
    return;
  }

  try {
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    if (!accounts.length) throw new Error('No wallet account was returned.');
    state.address = accounts[0];
    state.chainId = await provider.request({ method: 'eth_chainId' });
    state.balance = await provider.request({ method: 'eth_getBalance', params: [state.address, 'latest'] });
    state.connected = true;
    await refreshEthPrice();
    renderWallet();
    startBalanceRefresh();
    if (state.user) {
      await saveWallet();
    }
    toast('Wallet connected in view-only mode.');
  } catch (error) {
    if (error?.code !== 4001) toast('Unable to connect wallet. Please try again.');
  }

  async function saveWallet() {
    const response = await fetch('/api/wallets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: state.address, chainId: state.chainId }),
    });
    if (response.status === 401) {
      toast('Log in before saving a wallet to your workspace.');
      return;
    }
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'Wallet could not be saved.');
    }
  }

}

async function saveManualWallet(address, chainId) {
  const response = await fetch('/api/wallets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, chainId }),
  });
  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || 'Wallet could not be saved.');
  }
  state.user.wallets = [
    { address, chainId },
    ...(state.user.wallets || []).filter((wallet) => !(wallet.address.toLowerCase() === address.toLowerCase() && wallet.chainId === chainId)),
  ];
}

async function showManualWallet(address, chainId) {
  state.address = address;
  state.chainId = chainId;
  state.balance = null;
  state.ethPriceUsd = null;
  state.assets = [];
  state.connected = true;
  renderWallet();
  await saveManualWallet(address, chainId);
  try {
    await refreshBalance(true);
    if (!state.balance) throw new Error('Balance lookup failed.');
  } catch (error) {
    state.balance = null;
    renderWallet();
    $('#wallet-modal').classList.add('hidden');
    toast(`Wallet added, but balance lookup failed: ${error.message}`);
    return;
  }
  renderWallet();
  $('#wallet-modal').classList.add('hidden');
  toast('Public wallet added. Balance updated.');
}

async function loadSavedWallet() {
  const wallet = state.user?.wallets?.[0];
  if (!wallet) return;
  state.address = wallet.address;
  state.chainId = wallet.chainId;
  state.connected = true;
  renderWallet();
  try {
    await refreshBalance(true);
    startBalanceRefresh();
  } catch {
    toast('Wallet connected, but its current balance could not be loaded.');
  }
}

function disconnectWallet() {
  window.clearInterval(balanceRefreshTimer);
  state.connected = false;
  state.address = state.balance = state.ethPriceUsd = state.chainId = null;
  state.assets = [];
  renderWallet();
  renderAssets();
  toast('Wallet disconnected.');
}

function renderAssets() {
  const list = $('#asset-list');
  if (!state.connected) {
    list.innerHTML = '<p class="asset-empty">Connect a wallet to view all assets.</p>';
    return;
  }
  const native = state.balance ? `<div class="asset-row" data-asset="eth" tabindex="0"><span class="asset-icon eth-asset-icon" aria-label="Ethereum logo"></span><span class="asset-info"><strong>ETH</strong><small>Ethereum · Native balance</small></span><span class="asset-amount">${formatEth(state.balance)}<small>ETH</small></span></div>` : '';
  const tokens = state.assets.map((asset) => {
    const symbol = escapeHtml(asset.symbol);
    const trustWalletIcon = asset.address && /^0x[a-fA-F0-9]{40}$/.test(asset.address)
      ? `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${asset.address}/logo.png`
      : '';
    const providerIcon = typeof asset.iconUrl === 'string' && /^https:\/\//i.test(asset.iconUrl) ? asset.iconUrl : '';
    const iconUrl = trustWalletIcon || providerIcon;
    const fallbackIcon = trustWalletIcon && providerIcon && providerIcon !== trustWalletIcon ? providerIcon : '';
    const icon = iconUrl
      ? `<img src="${escapeHtml(iconUrl)}" alt="${symbol} logo" loading="lazy" data-fallback="${escapeHtml(fallbackIcon)}" onerror="if(this.dataset.fallback){this.src=this.dataset.fallback;this.dataset.fallback='';}else{this.hidden=true;this.nextElementSibling.hidden=false;}"><span hidden>${escapeHtml(asset.symbol.slice(0, 4))}</span>`
      : escapeHtml(asset.symbol.slice(0, 4));
    return `<div class="asset-row" data-asset="${escapeHtml(asset.address || '')}" tabindex="0"><span class="asset-icon token-asset-icon">${icon}</span><span class="asset-info"><strong>${symbol}</strong><small>${escapeHtml(asset.name)} · ERC-20</small></span><span class="asset-amount">${formatToken(asset.value, asset.decimals)}<small>${symbol}</small></span></div>`;
  }).join('');
  list.innerHTML = native + tokens || '<p class="asset-empty">No token balances found on this network.</p>';
}

function assetByIdentifier(identifier) {
  if (identifier === 'eth') return { name: 'Ethereum', symbol: 'ETH', decimals: 18, value: state.balance, address: 'eth' };
  return state.assets.find((asset) => asset.address?.toLowerCase() === identifier.toLowerCase());
}

function drawPriceChart(prices) {
  const chart = $('#price-chart');
  const values = prices.map((point) => point[1]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || max * 0.01 || 1;
  const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 720},${205 - ((value - min) / spread) * 180}`).join(' ');
  chart.innerHTML = `<line x1="0" y1="205" x2="720" y2="205" stroke="#ececf1"/><polyline points="${points}" fill="none" stroke="#6659dc" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
}

async function openAssetDetail(identifier) {
  const asset = assetByIdentifier(identifier);
  if (!asset) return;
  $('#asset-detail').classList.remove('hidden');
  $('#asset-detail-title').textContent = `${asset.name} (${asset.symbol})`;
  $('#asset-detail-subtitle').textContent = identifier === 'eth' ? 'Native Ethereum balance' : 'ERC-20 token balance';
  $('#asset-detail-price').textContent = 'Loading...';
  $('#asset-detail-change').textContent = 'Loading price movement...';
  $('#asset-detail-balance').textContent = `Balance: ${formatToken(asset.value, asset.decimals)} ${asset.symbol}`;
  try {
    const response = await fetch(`/api/market?asset=${encodeURIComponent(identifier)}&chainId=${encodeURIComponent(state.chainId)}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Market data unavailable.');
    const first = result.prices[0][1];
    const last = result.prices[result.prices.length - 1][1];
    const change = first ? ((last - first) / first) * 100 : 0;
    $('#asset-detail-price').textContent = last.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 6 });
    $('#asset-detail-change').textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}% over 24 hours`;
    drawPriceChart(result.prices);
  } catch (error) {
    $('#asset-detail-price').textContent = 'Unavailable';
    $('#asset-detail-change').textContent = error.message;
    $('#price-chart').innerHTML = '';
  }
  $('#asset-detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderWallet() {
  const button = $('#connect-button');
  $('#connect-label').textContent = state.connected ? shortenAddress(state.address) : 'Connect wallet';
  button.querySelector('.wallet-icon').textContent = state.connected ? '✓' : '◈';
  $('#wallet-count').textContent = state.user?.wallets?.length || (state.connected ? '1' : '0');
  $('#balance-value').innerHTML = state.balance ? `${formatEth(state.balance)}<small> ETH</small>` : '—<small> ETH</small>';
  $('#usd-value').textContent = state.balance && state.ethPriceUsd ? `${formatUsd(state.balance, state.ethPriceUsd)} · ETH price updates every 15 seconds` : (state.connected ? 'Loading current balance and value...' : 'Connect a wallet to view balance');
  $('#network-value').textContent = state.connected ? (state.chainId === '0x1' ? 'Ethereum mainnet' : `Chain ${parseInt(state.chainId, 16)}`) : 'Not connected';
  $('#activity-empty').classList.toggle('hidden', state.connected);
  $('#activity-list').classList.toggle('hidden', !state.connected);
  if (state.connected) {
    $('#activity-list').innerHTML = `<div class="connected-row"><span class="connected-check">✓</span><span><strong>Wallet connected</strong><small>${shortenAddress(state.address)} · Read-only</small></span><button id="disconnect-button">Disconnect</button></div>`;
    $('#disconnect-button').addEventListener('click', disconnectWallet);
  }
}

function setView(view) {
  const title = view[0].toUpperCase() + view.slice(1);
  $('#breadcrumb-current').textContent = title;
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === view));
  if (view !== 'overview') toast(`${title} is ready for the next phase.`);
}

$('#connect-button').addEventListener('click', () => state.connected ? disconnectWallet() : connectWallet());
$('#connect-empty').addEventListener('click', connectWallet);
$('#add-wallet').addEventListener('click', connectWallet);
const transferModal = $('#transfer-modal');
const countryNames = {
  AU: 'Australia', BR: 'Brazil', CA: 'Canada', FR: 'France', DE: 'Germany',
  IN: 'India', IT: 'Italy', JP: 'Japan', MX: 'Mexico', NL: 'Netherlands',
  SG: 'Singapore', ES: 'Spain', AE: 'United Arab Emirates', GB: 'United Kingdom', US: 'United States',
};
const bankingOptions = {
  AU: { currency: 'AUD', methods: ['Bank transfer (BECS)', 'PayID'], banks: ['Commonwealth Bank', 'Westpac', 'ANZ', 'NAB'] },
  BR: { currency: 'BRL', methods: ['PIX', 'TED bank transfer'], banks: ['Banco do Brasil', 'Itaú Unibanco', 'Bradesco', 'Caixa Econômica Federal'] },
  CA: { currency: 'CAD', methods: ['Interac e-Transfer', 'Domestic EFT'], banks: ['RBC Royal Bank', 'TD Canada Trust', 'Scotiabank', 'BMO'] },
  FR: { currency: 'EUR', methods: ['SEPA transfer', 'Instant SEPA transfer'], banks: ['BNP Paribas', 'Crédit Agricole', 'Société Générale', 'La Banque Postale'] },
  DE: { currency: 'EUR', methods: ['SEPA transfer', 'Instant SEPA transfer'], banks: ['Deutsche Bank', 'Commerzbank', 'DZ Bank', 'ING Germany'] },
  IN: { currency: 'INR', methods: ['UPI', 'IMPS', 'NEFT'], banks: ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank'] },
  IT: { currency: 'EUR', methods: ['SEPA transfer', 'Instant SEPA transfer'], banks: ['UniCredit', 'Intesa Sanpaolo', 'Banco BPM', 'BPER Banca'] },
  JP: { currency: 'JPY', methods: ['Domestic bank transfer', 'Furikomi'], banks: ['MUFG Bank', 'SMBC', 'Mizuho Bank', 'Japan Post Bank'] },
  MX: { currency: 'MXN', methods: ['SPEI', 'Domestic bank transfer'], banks: ['BBVA México', 'Santander México', 'Banorte', 'Citibanamex'] },
  NL: { currency: 'EUR', methods: ['SEPA transfer', 'Instant SEPA transfer'], banks: ['ING', 'ABN AMRO', 'Rabobank', 'SNS Bank'] },
  SG: { currency: 'SGD', methods: ['FAST', 'PayNow'], banks: ['DBS', 'OCBC', 'UOB', 'Standard Chartered Singapore'] },
  ES: { currency: 'EUR', methods: ['SEPA transfer', 'Instant SEPA transfer'], banks: ['Santander', 'BBVA', 'CaixaBank', 'Bankinter'] },
  AE: { currency: 'AED', methods: ['Local bank transfer', 'SWIFT transfer'], banks: ['Emirates NBD', 'First Abu Dhabi Bank', 'Mashreq', 'ADCB'] },
  GB: { currency: 'GBP', methods: ['Faster Payments', 'CHAPS', 'SWIFT transfer'], banks: ['Barclays', 'HSBC UK', 'Lloyds Bank', 'NatWest'] },
  US: { currency: 'USD', methods: ['ACH transfer', 'Domestic wire transfer', 'SWIFT transfer'], banks: ['JPMorgan Chase', 'Bank of America', 'Wells Fargo', 'Citibank'] },
};
const updateWithdrawalOptions = () => {
  const country = $('#withdraw-country').value;
  const currency = $('#withdraw-currency');
  const method = $('#transfer-method');
  const bank = $('#withdraw-bank');
  const amount = $('#withdraw-amount');
  const details = bankingOptions[country];
  [currency, method, bank].forEach((select) => select.replaceChildren());
  if (!details) {
    [currency, method, bank].forEach((select) => {
      select.disabled = true;
      select.add(new Option('Choose a country first', ''));
    });
    amount.placeholder = 'Choose a country first';
    return;
  }
  currency.disabled = false;
  currency.add(new Option(details.currency, details.currency));
  method.disabled = false;
  details.methods.forEach((item) => method.add(new Option(item, item)));
  bank.disabled = false;
  details.banks.forEach((item) => bank.add(new Option(item, item)));
  amount.placeholder = `e.g. 100 ${details.currency}`;
};
$('#withdraw-country').addEventListener('change', updateWithdrawalOptions);
const openTransfer = (mode) => {
  if (!state.connected || !state.address) {
    toast('Connect a wallet before using this action.');
    return;
  }
  const deposit = mode === 'deposit';
  $('#transfer-eyebrow').textContent = deposit ? 'DEPOSIT' : 'WITHDRAWAL';
  $('#transfer-title').textContent = deposit ? 'Receive funds' : 'Withdraw funds';
  $('#transfer-copy').textContent = deposit
    ? 'Send ETH or supported tokens to this public address.'
    : 'Navi is view-only and cannot move funds or sign withdrawal transactions.';
  $('#deposit-address').textContent = deposit ? state.address : 'Withdrawal transactions must be initiated and signed in your own wallet.';
  $('#deposit-address').classList.toggle('visible', deposit);
  $('#copy-address').classList.toggle('hidden', !deposit);
  $('#bank-withdrawal-form').classList.toggle('visible', !deposit);
  if (!deposit) {
    $('#withdraw-country').value = '';
    updateWithdrawalOptions();
    $('#bank-holder').value = '';
    $('#bank-account').value = '';
    $('#bank-code').value = '';
    $('#withdraw-amount').value = '';
  }
  $('#transfer-note').textContent = deposit
    ? `Only send assets on ${state.chainId === '0x1' ? 'Ethereum mainnet' : 'the selected network'}. Verify the network and address before sending.`
    : 'To withdraw, use your wallet provider or exchange directly. Never share a seed phrase or private key.';
  transferModal.classList.remove('hidden');
};
$('#deposit-action').addEventListener('click', () => openTransfer('deposit'));
$('#withdraw-action').addEventListener('click', () => { window.location.href = '/withdraw.html'; });
$('#transfer-close').addEventListener('click', () => transferModal.classList.add('hidden'));
transferModal.addEventListener('click', (event) => { if (event.target === transferModal) transferModal.classList.add('hidden'); });
$('#copy-address').addEventListener('click', async () => {
  await navigator.clipboard.writeText(state.address);
  toast('Public receiving address copied.');
});
$('#bank-withdrawal-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const country = $('#withdraw-country').value;
  const currency = $('#withdraw-currency').value;
  const method = $('#transfer-method').value;
  const bank = $('#withdraw-bank').value;
  const holder = $('#bank-holder').value.trim();
  const account = $('#bank-account').value.trim();
  const bankCode = $('#bank-code').value.trim();
  const amount = $('#withdraw-amount').value.trim();
  if (!country || !currency || !method || !bank || !holder || !account || !bankCode || !amount) {
    toast('Complete the country, transfer, account-holder, bank, and amount fields.');
    return;
  }
  $('#transfer-title').textContent = 'Withdrawal request ready';
  $('#transfer-copy').textContent = `Your ${amount} ${currency} request for ${holder} via ${method} to ${bank} in ${countryNames[country]} is ready for review.`;
  $('#bank-withdrawal-form').classList.remove('visible');
  $('#transfer-note').textContent = 'This is only a request preview. Navi does not hold funds, connect to banks, or execute withdrawals. Use your own regulated wallet or exchange to complete a transfer.';
  toast('Withdrawal request preview created. No funds were moved.');
});
$('#asset-list').addEventListener('click', (event) => {
  const row = event.target.closest('.asset-row');
  if (row) openAssetDetail(row.dataset.asset);
});
$('#asset-detail-close').addEventListener('click', () => $('#asset-detail').classList.add('hidden'));
document.querySelectorAll('[data-view]').forEach((item) => item.addEventListener('click', () => setView(item.dataset.view)));
$('.notice-close').addEventListener('click', () => $('#wallet-notice').remove());
const authModal = $('#auth-modal');
const showAuthenticatedHeader = () => {
  $('#login-button').classList.add('hidden');
  $('#account-button').classList.remove('hidden');
  $('#account-button').textContent = state.user?.fullName ? firstName(state.user.fullName) : 'Account';
};
const showProfile = () => {
  $('#profile-name').textContent = state.user.fullName || 'Not provided';
  $('#profile-email').textContent = state.user.email;
  $('#profile-country').textContent = state.user.country || 'Not provided';
  $('#profile-phone').textContent = state.user.phone || 'Not provided';
  document.querySelector('.profile-avatar').textContent = initials(state.user.fullName);
  $('#profile-modal').classList.remove('hidden');
};
const openAuth = (mode) => {
  const signup = mode === 'signup';
  authMode = mode;
  $('#auth-eyebrow').textContent = signup ? 'CREATE YOUR WORKSPACE' : 'WELCOME BACK';
  $('#auth-title').textContent = signup ? 'Create your Navi account' : 'Log in to your workspace';
  $('#auth-copy').textContent = signup ? 'Start monitoring your Ethereum wallets in view-only mode.' : 'Access your view-only wallet dashboard securely.';
  $('#auth-submit').textContent = signup ? 'Create account' : 'Log in';
  document.querySelectorAll('.signup-only').forEach((field) => field.classList.toggle('hidden', !signup));
  ['#auth-full-name', '#auth-country', '#auth-phone'].forEach((selector) => { $(selector).required = signup; });
  $('#auth-switch').innerHTML = signup ? 'Already have an account? <button type="button">Log in</button>' : 'New to Navi? <button type="button">Create an account</button>';
  $('#auth-switch button').addEventListener('click', () => openAuth(signup ? 'login' : 'signup'));
  authModal.classList.remove('hidden');
  $('#auth-email').focus();
};
$('#login-button').addEventListener('click', () => openAuth('login'));
$('#modal-close').addEventListener('click', () => authModal.classList.add('hidden'));
authModal.addEventListener('click', (event) => { if (event.target === authModal) authModal.classList.add('hidden'); });
$('#account-button').addEventListener('click', showProfile);
$('#profile-close').addEventListener('click', () => $('#profile-modal').classList.add('hidden'));
$('#profile-modal').addEventListener('click', (event) => { if (event.target === $('#profile-modal')) $('#profile-modal').classList.add('hidden'); });
$('#wallet-close').addEventListener('click', () => $('#wallet-modal').classList.add('hidden'));
$('#wallet-modal').addEventListener('click', (event) => { if (event.target === $('#wallet-modal')) $('#wallet-modal').classList.add('hidden'); });
$('#wallet-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const address = $('#manual-address').value.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    toast('Enter a valid 42-character Ethereum address.');
    return;
  }
  try {
    await showManualWallet(address, $('#manual-chain').value);
  } catch (error) {
    toast(error.message);
  }
});
$('#logout-button').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.replace('/landing.html');
});
$('#auth-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const endpoint = authMode === 'signup' ? '/api/signup' : '/api/login';
  const submitButton = $('#auth-submit');
  submitButton.disabled = true;
  submitButton.textContent = authMode === 'signup' ? 'Creating account...' : 'Logging in...';
  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: $('#auth-email').value, password: $('#auth-password').value, fullName: $('#auth-full-name').value, country: $('#auth-country').value, phone: $('#auth-phone').value }),
  }).then(async (response) => {
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Authentication failed.');
    state.user = result;
    showAuthenticatedHeader();
    window.location.replace('/index.html?welcome=1');
  }).catch((error) => {
    submitButton.disabled = false;
    submitButton.textContent = authMode === 'signup' ? 'Create account' : 'Log in';
    toast(error.message);
  });
});
fetch('/api/me', { cache: 'no-store' }).then(async (response) => {
  if (response.ok) {
    state.user = await response.json();
    $('#customer-first-name').textContent = firstName(state.user.fullName);
    document.querySelector('.avatar').textContent = initials(state.user.fullName);
    document.querySelector('.user-card strong').textContent = state.user.fullName || 'Customer';
    showAuthenticatedHeader();
    loadSavedWallet();
  }
}).catch(() => toast('Local backend is offline. Run server.py to use login.'));
if (new URLSearchParams(window.location.search).has('welcome')) {
  window.history.replaceState({}, '', '/index.html');
  toast('Account ready. Welcome to Navi.');
}
if (getProvider()) getProvider().on?.('accountsChanged', (accounts) => accounts.length ? connectWallet() : disconnectWallet());
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshBalance();
});
applyLanguage();
