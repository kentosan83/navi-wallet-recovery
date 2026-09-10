let authMode = 'login';
const $ = (selector) => document.querySelector(selector);
const landingTranslations = {
  en: ['How it works', 'Security', 'Connect wallet', 'Log in', 'Sign up'],
  es: ['Cómo funciona', 'Seguridad', 'Conectar billetera', 'Iniciar sesión', 'Registrarse'],
  fr: ['Comment ça marche', 'Sécurité', 'Connecter le portefeuille', 'Se connecter', "S'inscrire"],
  de: ['So funktioniert es', 'Sicherheit', 'Wallet verbinden', 'Anmelden', 'Registrieren'],
  pt: ['Como funciona', 'Segurança', 'Conectar carteira', 'Entrar', 'Registar'],
  ar: ['كيف يعمل', 'الأمان', 'ربط المحفظة', 'تسجيل الدخول', 'إنشاء حساب'],
  hi: ['यह कैसे काम करता है', 'सुरक्षा', 'वॉलेट कनेक्ट करें', 'लॉग इन', 'साइन अप'],
  zh: ['工作原理', '安全', '连接钱包', '登录', '注册'],
  ja: ['仕組み', 'セキュリティ', 'ウォレットを接続', 'ログイン', '登録'],
  ko: ['작동 방식', '보안', '지갑 연결', '로그인', '가입'],
};
const savedLanguage = localStorage.getItem('navi-language') || 'en';
function applyLandingLanguage(language) {
  const labels = landingTranslations[language] || landingTranslations.en;
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  const select = $('#language-select');
  if (select) select.value = language;
  const navLinks = document.querySelectorAll('.landing-nav nav > a');
  navLinks[0].textContent = labels[0];
  navLinks[1].textContent = labels[1];
  $('#wallet-button').textContent = labels[2];
  $('#login-button').textContent = labels[3];
  $('#signup-button').textContent = labels[4];
}
applyLandingLanguage(savedLanguage);
$('#language-select').addEventListener('change', (event) => {
  localStorage.setItem('navi-language', event.target.value);
  applyLandingLanguage(event.target.value);
});
const toast = (message) => { const node = $('#toast'); node.textContent = message; node.classList.add('show'); window.setTimeout(() => node.classList.remove('show'), 3000); };
const openAuth = (mode) => {
  authMode = mode;
  const signup = mode === 'signup';
  $('#auth-eyebrow').textContent = signup ? 'CREATE YOUR WORKSPACE' : 'WELCOME BACK';
  $('#auth-title').textContent = signup ? 'Create your Navi account' : 'Log in to your workspace';
  $('#auth-copy').textContent = signup ? 'Start monitoring your Ethereum wallets in view-only mode.' : 'Access your view-only wallet dashboard securely.';
  $('#auth-submit').textContent = signup ? 'Create account' : 'Log in';
  document.querySelectorAll('.signup-only').forEach((field) => field.classList.toggle('hidden', !signup));
  ['#auth-full-name', '#auth-country', '#auth-phone'].forEach((selector) => { $(selector).required = signup; });
  $('#auth-switch').innerHTML = signup ? 'Already have an account? <button type="button">Log in</button>' : 'New to Navi? <button type="button">Create an account</button>';
  $('#auth-switch button').addEventListener('click', () => openAuth(signup ? 'login' : 'signup'));
  $('#auth-modal').classList.remove('hidden');
  $('#auth-email').focus();
};
const openWalletFlow = async () => {
  try {
    const response = await fetch('/api/me');
    if (response.ok) {
      toast(authMode === 'signup' ? 'Account created. Opening your dashboard...' : 'Logged in. Opening your dashboard...');
      window.setTimeout(() => { window.location.href = '/index.html'; }, 250);
      return;
    }
  } catch (error) {
    toast('Start the local backend before connecting a wallet.');
    return;
  }
  toast('Create an account or log in before connecting a wallet.');
  openAuth('login');
};
['#login-button', '#hero-signup', '#bottom-signup', '#signup-button'].forEach((selector) => $(selector).addEventListener('click', () => openAuth(selector.includes('login') ? 'login' : 'signup')));
$('#wallet-button').addEventListener('click', openWalletFlow);
$('#hero-wallet').addEventListener('click', openWalletFlow);
$('#learn-button').addEventListener('click', () => $('#how-it-works').scrollIntoView({ behavior: 'smooth' }));
$('#modal-close').addEventListener('click', () => $('#auth-modal').classList.add('hidden'));
$('#auth-modal').addEventListener('click', (event) => { if (event.target.id === 'auth-modal') $('#auth-modal').classList.add('hidden'); });
$('#auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = $('#auth-submit');
  submitButton.disabled = true;
  submitButton.textContent = authMode === 'signup' ? 'Creating account...' : 'Logging in...';
  try {
    const response = await fetch(authMode === 'signup' ? '/api/signup' : '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: $('#auth-email').value, password: $('#auth-password').value, fullName: $('#auth-full-name').value, country: $('#auth-country').value, phone: $('#auth-phone').value }) });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 409 && authMode === 'signup') {
        openAuth('login');
        submitButton.disabled = false;
        submitButton.textContent = 'Log in';
        toast('This email already has an account. Enter your password to log in.');
        return;
      }
      throw new Error(result.error || 'Authentication failed.');
    }
    window.location.replace('/index.html?welcome=1');
  } catch (error) {
    submitButton.disabled = false;
    submitButton.textContent = authMode === 'signup' ? 'Create account' : 'Log in';
    toast(error.message);
  }
});
