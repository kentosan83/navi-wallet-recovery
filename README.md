# Navi Wallet Recovery

## Run locally

From this folder, run:

```powershell
py .\server.py
```

Then open:

- Customer app: http://localhost:8080/index.html
- Public introduction: http://localhost:8080/landing.html
- Admin page: http://localhost:8080/admin.html
- Withdrawal request page: http://localhost:8080/withdraw.html

The backend uses Python's standard library and creates `navi.sqlite3` automatically. It provides:

- `POST /api/signup`
- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`
- `POST /api/wallets`

Sign-up collects and stores the customer's full name, country, and phone number.

Passwords are hashed with PBKDF2-SHA256 and login sessions are stored in an HTTP-only cookie. Connected wallet addresses are stored per customer; private keys and seed phrases are never requested or stored. If a browser wallet extension is unavailable, use the "Add a public wallet" fallback to paste a public Ethereum address. The local backend retrieves live ETH balances for Ethereum mainnet and Sepolia through public RPC endpoints, plus current ERC-20 token balances (such as DAI), ETH/USD value, and 24-hour market charts for assets listed by CoinGecko.

The public landing page and customer dashboard include a language switcher for English, Spanish, French, German, Portuguese, Arabic, Hindi, Chinese, Japanese, and Korean. The selected language is saved locally, and Arabic enables right-to-left layout.

The customer dashboard includes Deposit and Withdraw actions. Deposit displays the connected public address. Withdraw supports selecting a destination country, including Japan, and entering bank details for a local request preview only; no bank details are stored and no funds are transferred by this view-only app.

Withdrawal country selection now provides the country's local currency, common transfer methods, and example major banks (including Japanese JPY, Furikomi, and Japan Post Bank options). These are informational options for the preview and are not live bank integrations or guarantees of availability.

The dashboard Withdraw action opens the dedicated `withdraw.html` page. The page requires an authenticated customer session, validates the complete request form, and displays a local preview without storing bank details or moving funds.

The withdrawal page also displays a live USD-only available balance for the newest saved wallet. It combines the current ETH balance with ERC-20 token balances that have a USD exchange rate from the token data provider, and refreshes every 15 seconds. Tokens without a provider USD rate are still visible on the dashboard but cannot be included in a USD total until a market price is available.

Submitting the withdrawal form opens `review-withdrawal.html`, where the customer enters a transfer reason and reviews the request summary. The request is held in browser session storage only for this two-step preview and is removed after the final preview; it is not submitted to the backend and no transfer is executed.

Withdrawal country selection also sets the local currency: Japan uses JPY, the United States USD, the United Kingdom GBP, India INR, Canada CAD, Australia AUD, Brazil BRL, Mexico MXN, Singapore SGD, the United Arab Emirates AED, and euro-area countries EUR.

## Deploy online with Render

The repository includes `render.yaml` for a Render web service. Render runs the Python backend continuously while your laptop is off, provides HTTPS, and mounts `/var/data` as persistent storage for `navi.sqlite3`.

1. Put this folder in a GitHub repository. Do not commit secrets or the `.venv` folder.
2. In Render, choose **New + → Blueprint** and connect the GitHub repository.
3. Select the repository's `render.yaml` file and create the service.
4. After deployment, open the generated `https://...onrender.com/landing.html` URL.
5. Add a custom domain in Render if you want a branded public address.

The Render configuration uses a persistent disk because SQLite data is otherwise lost when a service is redeployed. Persistent disks are part of Render's paid service plans. Before public launch, review admin authorization, add rate limiting and CSRF protection, set secure cookie attributes, and use a production database such as PostgreSQL if multiple service instances are needed.
