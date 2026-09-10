const $ = (selector) => document.querySelector(selector);
const countryNames = { AU: 'Australia', BR: 'Brazil', CA: 'Canada', FR: 'France', DE: 'Germany', IN: 'India', IT: 'Italy', JP: 'Japan', MX: 'Mexico', NL: 'Netherlands', SG: 'Singapore', ES: 'Spain', AE: 'United Arab Emirates', GB: 'United Kingdom', US: 'United States' };
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
const formatUsd = (value) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const parseTokenBalance = (value, decimals) => {
  if (!value || decimals < 0) return 0;
  const raw = value.padStart(decimals + 1, '0');
  const whole = raw.slice(0, -decimals || undefined) || '0';
  const fraction = decimals ? `.${raw.slice(-decimals)}` : '';
  return Number(`${whole}${fraction}`);
};
const loadAvailableBalance = async () => {
  const status = $('#available-balance-status');
  try {
    const meResponse = await fetch('/api/me', { cache: 'no-store' });
    if (!meResponse.ok) throw new Error('Sign in to view your balance.');
    const me = await meResponse.json();
    const wallet = (me.wallets || [])[0];
    if (!wallet) throw new Error('Connect a wallet on the dashboard first.');
    const params = `address=${encodeURIComponent(wallet.address)}&chainId=${encodeURIComponent(wallet.chain_id)}`;
    const [balanceResponse, priceResponse, assetsResponse] = await Promise.all([
      fetch(`/api/balance?${params}`, { cache: 'no-store' }),
      fetch('/api/eth-price', { cache: 'no-store' }),
      fetch(`/api/assets?${params}`, { cache: 'no-store' }),
    ]);
    const [balance, price, assets] = await Promise.all([balanceResponse.json(), priceResponse.json(), assetsResponse.json()]);
    if (!balanceResponse.ok || !priceResponse.ok || !assetsResponse.ok) throw new Error(balance.error || price.error || assets.error || 'Balance unavailable.');
    const ethUsd = Number(BigInt(balance.balance)) / 1e18 * Number(price.usd);
    const tokensUsd = (assets.assets || []).reduce((total, asset) => {
      const exchangeRate = Number(asset.exchangeRate);
      return Number.isFinite(exchangeRate) ? total + parseTokenBalance(asset.value, asset.decimals) * exchangeRate : total;
    }, 0);
    $('#available-usd').textContent = formatUsd(ethUsd + tokensUsd);
    status.textContent = `${wallet.chain_id === '0x1' ? 'Ethereum mainnet' : 'Selected network'} · ETH and supported tokens`;
  } catch (error) {
    $('#available-usd').textContent = 'Unavailable';
    status.textContent = error.message;
  }
};
const updateOptions = () => {
  const details = bankingOptions[$('#withdraw-country').value];
  const selects = [$('#withdraw-currency'), $('#transfer-method'), $('#withdraw-bank')];
  selects.forEach((select) => { select.replaceChildren(); select.disabled = !details; });
  if (!details) {
    selects.forEach((select) => select.add(new Option('Choose a country first', '')));
    $('#withdraw-amount').placeholder = 'Choose a country first';
    return;
  }
  $('#withdraw-currency').add(new Option(details.currency, details.currency));
  details.methods.forEach((value) => $('#transfer-method').add(new Option(value, value)));
  details.banks.forEach((value) => $('#withdraw-bank').add(new Option(value, value)));
  $('#withdraw-amount').placeholder = `e.g. 100 ${details.currency}`;
};
fetch('/api/me', { cache: 'no-store' }).then((response) => {
  if (!response.ok) window.location.replace('/landing.html');
}).catch(() => window.location.replace('/landing.html'));
loadAvailableBalance();
window.setInterval(loadAvailableBalance, 15000);
$('#withdraw-country').addEventListener('change', updateOptions);
$('#withdraw-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const country = $('#withdraw-country').value;
  const currency = $('#withdraw-currency').value;
  const method = $('#transfer-method').value;
  const bank = $('#withdraw-bank').value;
  const holder = $('#bank-holder').value.trim();
  const account = $('#bank-account').value.trim();
  const bankCode = $('#bank-code').value.trim();
  const amount = $('#withdraw-amount').value.trim();
  sessionStorage.setItem('navi-withdrawal-request', JSON.stringify({
    country, countryName: countryNames[country], currency, method, bank, holder, account, bankCode, amount,
  }));
  window.location.href = '/review-withdrawal.html';
});
