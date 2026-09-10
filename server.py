import hashlib
import os
os.environ["HOST"] = "0.0.0.0"
import hmac
import http.cookies
import json
import os
import re
import secrets
import sqlite3
import time
import urllib.error
import urllib.request
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get("NAVI_DATA_DIR", ROOT)
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "navi.sqlite3")
SESSION_TTL = 60 * 60 * 24 * 7
RPC_ENDPOINTS = {
    "0x1": "https://ethereum-rpc.publicnode.com",
    "0xaa36a7": "https://ethereum-sepolia-rpc.publicnode.com",
}
ETH_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
TOKEN_ENDPOINTS = {
    "0x1": "https://eth.blockscout.com/api/v2/addresses/{address}/tokens?type=ERC-20",
    "0xaa36a7": "https://eth-sepolia.blockscout.com/api/v2/addresses/{address}/tokens?type=ERC-20",
}
COINGECKO_API = "https://api.coingecko.com/api/v3"


def db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize():
    with db() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL DEFAULT '',
                country TEXT NOT NULL DEFAULT '',
                phone TEXT NOT NULL DEFAULT '',
                role TEXT NOT NULL DEFAULT 'customer',
                created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS wallets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                address TEXT NOT NULL COLLATE NOCASE,
                chain_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                UNIQUE(user_id, address, chain_id)
            );
            """
        )
        columns = {row["name"] for row in connection.execute("PRAGMA table_info(users)")}
        for name in ("full_name", "country", "phone"):
            if name not in columns:
                connection.execute(f"ALTER TABLE users ADD COLUMN {name} TEXT NOT NULL DEFAULT ''")


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 210_000)
    return f"{salt}${digest.hex()}"


def password_matches(password, stored):
    salt, expected = stored.split("$", 1)
    actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 210_000).hex()
    return hmac.compare_digest(actual, expected)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {format % args}")

    def send_json(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def body(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length > 10_000:
            raise ValueError("Request body is too large.")
        return json.loads(self.rfile.read(length) or b"{}")

    def current_user(self):
        cookies = http.cookies.SimpleCookie(self.headers.get("Cookie"))
        token = cookies.get("navi_session")
        if not token:
            return None
        with db() as connection:
            row = connection.execute(
                "SELECT users.id, users.email, users.full_name, users.country, users.phone, users.role FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token = ? AND sessions.expires_at > ?",
                (token.value, int(time.time())),
            ).fetchone()
        return row

    def set_session(self, user_id):
        token = secrets.token_urlsafe(32)
        with db() as connection:
            connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (int(time.time()),))
            connection.execute(
                "INSERT INTO sessions(token, user_id, expires_at) VALUES (?, ?, ?)",
                (token, user_id, int(time.time()) + SESSION_TTL),
            )
        cookie = http.cookies.SimpleCookie()
        cookie["navi_session"] = token
        cookie["navi_session"]["httponly"] = True
        cookie["navi_session"]["samesite"] = "Lax"
        cookie["navi_session"]["path"] = "/"
        cookie["navi_session"]["max-age"] = SESSION_TTL
        return cookie.output(header="").strip()

    def require_user(self):
        user = self.current_user()
        if not user:
            self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Please log in first."})
        return user

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            data = self.body()
            if path == "/api/signup":
                email = str(data.get("email", "")).strip().lower()
                password = str(data.get("password", ""))
                full_name = str(data.get("fullName", "")).strip()
                country = str(data.get("country", "")).strip()
                phone = str(data.get("phone", "")).strip()
                if "@" not in email or len(email) > 254:
                    return self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Enter a valid email address."})
                if len(password) < 8:
                    return self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Password must be at least 8 characters."})
                if len(full_name) < 2 or len(full_name) > 100:
                    return self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Enter your full name."})
                if not country or len(country) > 80:
                    return self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Select your country."})
                if len(phone) < 7 or len(phone) > 30:
                    return self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Enter a valid phone number."})
                with db() as connection:
                    try:
                        cursor = connection.execute(
                            "INSERT INTO users(email, password_hash, full_name, country, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                            (email, password_hash(password), full_name, country, phone, int(time.time())),
                        )
                    except sqlite3.IntegrityError:
                        return self.send_json(HTTPStatus.CONFLICT, {"error": "An account with that email already exists."})
                self.send_response(HTTPStatus.CREATED)
                self.send_header("Set-Cookie", self.set_session(cursor.lastrowid))
                self.send_header("Content-Type", "application/json")
                payload = json.dumps({"email": email, "fullName": full_name, "country": country, "phone": phone, "role": "customer"}).encode()
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            if path == "/api/login":
                email = str(data.get("email", "")).strip().lower()
                with db() as connection:
                    user = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
                if not user or not password_matches(str(data.get("password", "")), user["password_hash"]):
                    return self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Email or password is incorrect."})
                self.send_response(HTTPStatus.OK)
                self.send_header("Set-Cookie", self.set_session(user["id"]))
                self.send_header("Content-Type", "application/json")
                payload = json.dumps({"email": user["email"], "fullName": user["full_name"], "country": user["country"], "phone": user["phone"], "role": user["role"]}).encode()
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            if path == "/api/logout":
                cookies = http.cookies.SimpleCookie(self.headers.get("Cookie"))
                token = cookies.get("navi_session")
                if token:
                    with db() as connection:
                        connection.execute("DELETE FROM sessions WHERE token = ?", (token.value,))
                self.send_response(HTTPStatus.OK)
                self.send_header("Set-Cookie", "navi_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            if path == "/api/wallets":
                user = self.require_user()
                if not user:
                    return
                address = str(data.get("address", "")).strip()
                chain_id = str(data.get("chainId", "")).strip()
                if not address.startswith("0x") or len(address) != 42 or not chain_id:
                    return self.send_json(HTTPStatus.BAD_REQUEST, {"error": "A valid wallet address and network are required."})
                with db() as connection:
                    connection.execute(
                        "INSERT OR IGNORE INTO wallets(user_id, address, chain_id, created_at) VALUES (?, ?, ?, ?)",
                        (user["id"], address, chain_id, int(time.time())),
                    )
                return self.send_json(HTTPStatus.CREATED, {"address": address, "chainId": chain_id})
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "API endpoint not found."})
        except (ValueError, json.JSONDecodeError):
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Invalid request."})

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path == "/":
            self.send_response(HTTPStatus.TEMPORARY_REDIRECT)
            self.send_header("Location", "/landing.html")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if path == "/api/me":
            user = self.current_user()
            if not user:
                return self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Not authenticated."})
            with db() as connection:
                wallets = connection.execute(
                    "SELECT address, chain_id AS chainId, created_at AS createdAt FROM wallets WHERE user_id = ? ORDER BY id DESC",
                    (user["id"],),
                ).fetchall()
            return self.send_json(HTTPStatus.OK, {"email": user["email"], "fullName": user["full_name"], "country": user["country"], "phone": user["phone"], "role": user["role"], "wallets": [dict(row) for row in wallets]})
        if path == "/api/balance":
            if not self.current_user():
                return self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Not authenticated."})
            from urllib.parse import parse_qs
            query = parse_qs(parsed.query)
            address = query.get("address", [""])[0]
            chain_id = query.get("chainId", ["0x1"])[0]
            if not re.fullmatch(r"0x[a-fA-F0-9]{40}", address):
                return self.send_json(HTTPStatus.BAD_REQUEST, {"error": "A valid Ethereum address is required."})
            endpoint = RPC_ENDPOINTS.get(chain_id)
            if not endpoint:
                return self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Unsupported Ethereum network."})
            request_body = json.dumps({
                "jsonrpc": "2.0",
                "method": "eth_getBalance",
                "params": [address, "latest"],
                "id": 1,
            }).encode()
            rpc_request = urllib.request.Request(
                endpoint,
                data=request_body,
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "NaviWalletRecovery/1.0",
                },
                method="POST",
            )
            try:
                with urllib.request.urlopen(rpc_request, timeout=8) as response:
                    result = json.loads(response.read())
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
                return self.send_json(HTTPStatus.BAD_GATEWAY, {"error": "The Ethereum balance service is unavailable."})
            if result.get("error") or not isinstance(result.get("result"), str):
                return self.send_json(HTTPStatus.BAD_GATEWAY, {"error": "The Ethereum network did not return a balance."})
            return self.send_json(HTTPStatus.OK, {"address": address, "chainId": chain_id, "balance": result["result"]})
        if path == "/api/eth-price":
            if not self.current_user():
                return self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Not authenticated."})
            price_request = urllib.request.Request(
                ETH_PRICE_URL,
                headers={"User-Agent": "NaviWalletRecovery/1.0"},
            )
            try:
                with urllib.request.urlopen(price_request, timeout=8) as response:
                    price_data = json.loads(response.read())
                price = price_data["ethereum"]["usd"]
                if not isinstance(price, (int, float)):
                    raise ValueError("Invalid price response")
            except (urllib.error.URLError, TimeoutError, ValueError, KeyError, TypeError, json.JSONDecodeError):
                return self.send_json(HTTPStatus.BAD_GATEWAY, {"error": "The ETH price service is unavailable."})
            return self.send_json(HTTPStatus.OK, {"usd": price})
        if path == "/api/assets":
            if not self.current_user():
                return self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Not authenticated."})
            from urllib.parse import parse_qs
            query = parse_qs(parsed.query)
            address = query.get("address", [""])[0]
            chain_id = query.get("chainId", ["0x1"])[0]
            if not re.fullmatch(r"0x[a-fA-F0-9]{40}", address):
                return self.send_json(HTTPStatus.BAD_REQUEST, {"error": "A valid Ethereum address is required."})
            endpoint = TOKEN_ENDPOINTS.get(chain_id)
            if not endpoint:
                return self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Unsupported Ethereum network."})
            token_request = urllib.request.Request(
                endpoint.format(address=address),
                headers={"User-Agent": "NaviWalletRecovery/1.0"},
            )
            try:
                with urllib.request.urlopen(token_request, timeout=12) as response:
                    token_data = json.loads(response.read())
                assets = []
                for item in token_data.get("items", []):
                    token = item.get("token", {})
                    value = item.get("value")
                    decimals = int(token.get("decimals") or 0)
                    if not token.get("symbol") or not isinstance(value, str):
                        continue
                    assets.append({
                        "symbol": token["symbol"],
                        "name": token.get("name") or token["symbol"],
                        "address": token.get("address_hash"),
                        "value": value,
                        "decimals": decimals,
                        "exchangeRate": token.get("exchange_rate"),
                        "iconUrl": token.get("icon_url"),
                    })
            except (urllib.error.URLError, TimeoutError, ValueError, TypeError, KeyError, json.JSONDecodeError):
                return self.send_json(HTTPStatus.BAD_GATEWAY, {"error": "Token balances are temporarily unavailable."})
            return self.send_json(HTTPStatus.OK, {"address": address, "chainId": chain_id, "assets": assets})
        if path == "/api/market":
            if not self.current_user():
                return self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Not authenticated."})
            from urllib.parse import parse_qs
            query = parse_qs(parsed.query)
            asset_address = query.get("asset", [""])[0]
            chain_id = query.get("chainId", ["0x1"])[0]
            if chain_id != "0x1":
                return self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Market charts are currently available for Ethereum mainnet."})
            if asset_address.lower() in ("eth", "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"):
                endpoint = f"{COINGECKO_API}/coins/ethereum/market_chart?vs_currency=usd&days=1&interval=hourly"
            elif re.fullmatch(r"0x[a-fA-F0-9]{40}", asset_address):
                endpoint = f"{COINGECKO_API}/coins/ethereum/contract/{asset_address}/market_chart?vs_currency=usd&days=1"
            else:
                return self.send_json(HTTPStatus.BAD_REQUEST, {"error": "A valid asset is required."})
            market_request = urllib.request.Request(endpoint, headers={"User-Agent": "NaviWalletRecovery/1.0"})
            try:
                with urllib.request.urlopen(market_request, timeout=12) as response:
                    market_data = json.loads(response.read())
                prices = [[int(point[0]), float(point[1])] for point in market_data.get("prices", []) if len(point) >= 2]
                if not prices:
                    raise ValueError("No price history")
            except (urllib.error.URLError, TimeoutError, ValueError, TypeError, KeyError, json.JSONDecodeError):
                return self.send_json(HTTPStatus.BAD_GATEWAY, {"error": "Price history is temporarily unavailable."})
            return self.send_json(HTTPStatus.OK, {"prices": prices, "price": prices[-1][1]})
        if path.startswith("/api/"):
            return self.send_json(HTTPStatus.NOT_FOUND, {"error": "API endpoint not found."})
        return super().do_GET()


if __name__ == "__main__":
    initialize()
    port = int(os.environ.get("PORT", "8080"))
    host = os.environ.get("HOST", "127.0.0.1")
    print(f"Navi backend running on {host}:{port}")
    ThreadingHTTPServer((host, port), Handler).serve_forever()
