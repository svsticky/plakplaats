import os, requests, flask, json
from flask import Flask, request, redirect, url_for, render_template, jsonify
from functools import wraps
from flask_jwt_extended import (
    JWTManager,
    verify_jwt_in_request,
    current_user,
)
from jwt.algorithms import RSAAlgorithm 
from dotenv import load_dotenv

load_dotenv()

class Config:
    # OIDC info
    OIDC_ISSUER_BASE   = os.getenv("KOALA_URL")
    OIDC_CLIENT_ID     = os.getenv("KOALA_CLIENT_UID")
    OIDC_CLIENT_SECRET = os.getenv("KOALA_CLIENT_SECRET")
    OIDC_SCOPES        = os.getenv("OIDC_SCOPES")

    # Flask‑JWT‑Extended config
    JWT_ALGORITHM        = "RS256"
    JWT_PUBLIC_KEY       = None   # this gets filled in at startup
    JWT_TOKEN_LOCATION   = ["cookies"]
    JWT_ACCESS_COOKIE_PATH = "/"
    JWT_COOKIE_SECURE    = True

# ─── Flask + JWT init ────────────────────────────────────────────────────
app = Flask(__name__)
app.config.from_object(Config)

disc = requests.get(f"{app.config['OIDC_ISSUER_BASE']}/.well-known/openid-configuration", verify=True).json()
jwks = requests.get(disc["jwks_uri"], verify=True).json()
app.config["JWT_PUBLIC_KEY"] = RSAAlgorithm.from_jwk(json.dumps(jwks["keys"][0]))

jwt = JWTManager(app)

class User:
    def __init__(self, sub, email, is_super_admin, full_name):
        self.sub        = sub
        self.email      = email
        self.is_super_admin  = is_super_admin
        self.full_name  = full_name

@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    return User(
        sub       = int(jwt_data["sub"]),
        email     = jwt_data.get("email"),
        is_super_admin = jwt_data.get("is_admin"),
        full_name = jwt_data.get("full_name", "")
    )

# ─── Helper decorators ────────────────────────────────────────────────────
@jwt.unauthorized_loader
def redirect_missing_token(error_string):
    return redirect(url_for("login"))

@jwt.invalid_token_loader
def redirect_invalid_token(error_string):
    return redirect(url_for("login"))

@jwt.expired_token_loader
def redirect_expired_token(jwt_header, jwt_payload):
    return redirect(url_for("login"))

# ─── Your token_required decorator & routes ───────────────────────────────
def login_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        verify_jwt_in_request()
        return fn(*a, **kw)
    return wrapper

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        adminList = [3, 412]
        approved = (current_user.sub in adminList) or current_user.is_super_admin
        if not approved:
             return "User does not have admin rights", 403
        return fn(*args, **kwargs)
    return wrapper

def super_admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        if not current_user.is_super_admin:
            return "User does not have super admin rights", 403
        return fn(*args, **kwargs)
    return wrapper

# ─── Root & Protected Routes ─────────────────────────────────────────────
@app.route("/")
def home():
    return """
      <p>Home—public.</p>
      <p><a href='/token-protected'>Protected</a></p>
      <p><a href='/profile'>Profile</a></p>
      <p><a href='/admin'>Admin only</a></p>
      <p><a href='/superadmin'>Superadmin only</a></p>
      <p><a href='/logout'>Logout</a></p>
    """

@app.route("/token-protected")
@login_required
def secret():
    return jsonify(msg="🎉 You're in! Your JWT cookie worked."), 200

@app.route("/profile")
@login_required
def profile():
    return jsonify({
        "sub"       : current_user.sub,
        "is_super_admin"  : current_user.is_super_admin,
        "email"     : current_user.email,
        "full_name" : current_user.full_name
    })

@app.route("/admin")
@admin_required
def admin_dashboard():
    return render_template("admin.html")

@app.route("/superadmin")
@super_admin_required
def superadmin_dashboard():
    return jsonify(msg="🚀 Welcome, superadmin!"), 200

@app.route("/logout")
def logout():
    resp = flask.make_response(redirect(url_for("home")))
    resp.delete_cookie("access_token_cookie", path="/")
    return resp

# ─── OpenID /auth Flow ───────────────────────────────────────────────────
@app.route("/login")
def login():
    code = request.args.get("code")
    if not code:
        # Redirect user to Koala login
        auth_url = (
            f"{Config.OIDC_ISSUER_BASE}/api/oauth/authorize"
            f"?client_id={Config.OIDC_CLIENT_ID}"
            f"&scope={Config.OIDC_SCOPES}"
            f"&redirect_uri={url_for('login', _external=True)}"
            "&response_type=code"
        )
        return render_template("login.html", loginUrl=auth_url)

    # Exchange code for tokens
    token_response = requests.post(
        f"{Config.OIDC_ISSUER_BASE}/api/oauth/token",
        data={
            "grant_type":   "authorization_code",
            "code":         code,
            "redirect_uri": url_for('login', _external=True)
        },
        auth=(Config.OIDC_CLIENT_ID, Config.OIDC_CLIENT_SECRET)
    ).json()

    # Redirect user to login when there is no id_token
    id_token = token_response.get("id_token")
    if not id_token:
        return redirect(url_for("login"))

    # Set the Koala ID‑token as the cookie
    resp = flask.make_response(redirect(url_for("home")))
    resp.set_cookie(
        "access_token_cookie",
        id_token,
        httponly=True,
        secure=Config.JWT_COOKIE_SECURE,
        path="/"
    )
    return resp

if __name__ == "__main__":
    app.run(port=7050, debug=True)
