const $ = (selector) => document.querySelector(selector);
const requestKey = 'navi-withdrawal-request';
const request = JSON.parse(sessionStorage.getItem(requestKey) || 'null');

if (!request) {
  window.location.replace('/withdraw.html');
} else {
  $('#review-summary').innerHTML = `
    <div><span>Amount</span><strong>${escapeHtml(request.amount)} ${escapeHtml(request.currency)}</strong></div>
    <div><span>Destination</span><strong>${escapeHtml(request.countryName)}</strong></div>
    <div><span>Transfer method</span><strong>${escapeHtml(request.method)}</strong></div>
    <div><span>Bank</span><strong>${escapeHtml(request.bank)}</strong></div>
    <div><span>Account holder</span><strong>${escapeHtml(request.holder)}</strong></div>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

fetch('/api/me', { cache: 'no-store' }).then((response) => {
  if (!response.ok) window.location.replace('/landing.html');
}).catch(() => window.location.replace('/landing.html'));

$('#reason-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const reason = $('#transfer-reason').value.trim();
  const result = $('#review-result');
  result.textContent = `Your ${request.amount} ${request.currency} request for ${request.holder} via ${request.method} to ${request.bank} in ${request.countryName} is ready for review. Reason: ${reason}. No funds were moved.`;
  result.classList.remove('hidden');
  event.currentTarget.classList.add('hidden');
  sessionStorage.removeItem(requestKey);
});
