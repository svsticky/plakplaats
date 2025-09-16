import flask
from flask import request
from flask import jsonify
from flask import render_template
import requests
import psycopg2
import json
import os
from werkzeug.utils import redirect, secure_filename
import random
from dotenv import load_dotenv
import datetime

import json
from functools import wraps

import requests
from flask import Flask
from flask import jsonify
from flask import url_for
from jwt.algorithms import RSAAlgorithm

from flask_jwt_extended import current_user
from flask_jwt_extended import JWTManager
from flask_jwt_extended import verify_jwt_in_request

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
from urllib.parse import urlparse

if (not os.path.exists("./static/uploads")):
    os.mkdir("./static/uploads")

load_dotenv()

class Config:
    # OIDC info
    OIDC_ISSUER_BASE   = os.getenv("KOALA_URL")
    OIDC_CLIENT_ID     = os.getenv("KOALA_CLIENT_UID")
    OIDC_CLIENT_SECRET = os.getenv("KOALA_CLIENT_SECRET")
    OIDC_SCOPES        = os.getenv("OIDC_SCOPES")

    # Flask‑JWT‑Extended config
    JWT_ALGORITHM        = "RS256"
    JWT_PUBLIC_KEY       = None   # gets filled in at startup
    JWT_TOKEN_LOCATION   = ["cookies"]
    JWT_ACCESS_COOKIE_PATH = "/"
    JWT_COOKIE_SECURE    = True

    # Postgres config
    POSTGRES_HOST = os.getenv("POSTGRES_HOST")
    POSTGRES_DBNAME = os.getenv("POSTGRES_DBNAME")
    POSTGRES_USER = os.getenv("POSTGRES_USER")
    POSTGRES_PASS = os.getenv("POSTGRES_PASS")
    POSTGRES_PORT = os.getenv("POSTGRES_PORT")

    # Miscellaneous
    BOARD_COLOR = os.getenv("STICKER_MAP_COLOR")
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    UPLOAD_DIRECTORY = "static/uploads"

# ─── Flask + JWT init ────────────────────────────────────────────────────
app = Flask(__name__)
app.config.from_object(Config)

disc = requests.get(f"{app.config['OIDC_ISSUER_BASE']}/.well-known/openid-configuration", verify=True).json()
jwks = requests.get(disc["jwks_uri"], verify=True).json()
app.config["JWT_PUBLIC_KEY"] = RSAAlgorithm.from_jwk(json.dumps(jwks["keys"][0]))

jwt = JWTManager(app)

con = psycopg2.connect(host=Config.POSTGRES_HOST, dbname=Config.POSTGRES_DBNAME, user=Config.POSTGRES_USER, password=Config.POSTGRES_PASS, port=Config.POSTGRES_PORT)

cursor = con.cursor()

cursor.execute("CREATE TABLE IF NOT EXISTS stickers (stickerID SERIAL PRIMARY KEY, stickerLat Decimal(8,6), stickerLon Decimal(9,6), logoID INT, pictureUrl VARCHAR(255), adderEmail VARCHAR(255), postTime TIMESTAMP, spots INT, boardYear INT, verified INT)")

con.commit()

cursor.close()
con.close()

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
def _login_redirect():
    next_url = request.url
    path = urlparse(next_url).path
    if path == '/':
        return redirect(url_for("login"))
    return redirect(url_for("login", next=path))

@jwt.unauthorized_loader
def redirect_missing_token(error_string):
    return _login_redirect()

@jwt.invalid_token_loader
def redirect_invalid_token(error_string):
    return _login_redirect()

@jwt.expired_token_loader
def redirect_expired_token(jwt_header, jwt_payload):
    return _login_redirect()

# ─── Wrappers for authorization ───────────────────────────────
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

# ─── Frontend Routes ─────────────────────────────────────────────
@app.route('/')
@login_required
def stickerMap():
    return render_template('home.html', username=current_user.full_name)

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
    next_url = request.args.get("next") or url_for("stickerMap")
    resp = flask.make_response(redirect(next_url))
    resp.delete_cookie("access_token_cookie", path="/")
    return resp

# ─── OpenID /auth Flow ───────────────────────────────────────────────────
@app.route("/login")
def login():
    code = request.args.get("code")
    if not code:
        next_url = request.args.get("next") or url_for("stickerMap")
        auth_url = (
            f"{Config.OIDC_ISSUER_BASE}/api/oauth/authorize"
            f"?client_id={Config.OIDC_CLIENT_ID}"
            f"&scope={Config.OIDC_SCOPES}"
            f"&redirect_uri={url_for('login', _external=True)}"
            f"&response_type=code"
            f"&state={next_url}"
        )
        return render_template("login.html", loginUrl=auth_url)

    next_url = request.args.get("next") or url_for("stickerMap")

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

    next_url = request.args.get("state") or url_for("stickerMap")

    # Set the Koala ID‑token as the cookie
    resp = flask.make_response(redirect(next_url))
    resp.set_cookie(
        "access_token_cookie",
        id_token,
        httponly=True,
        secure=Config.JWT_COOKIE_SECURE,
        path="/"
    )
    return resp

# ─── Backend routes ───────────────────────────────────────────────────
@app.route('/upload', methods=['GET', 'POST'])
def uploadSticker():
    # Check if request is sent with HTTP Post method
    if request.method == 'POST':
        # Check if all required parameters are available and good
        if request.form['lat'] != '' and request.form['lon'] != '' and request.form['logoId'] != '':
            if 'image' in request.files and request.files['image'].filename != '':
                file = request.files['image']
                if (file and allowed_file(file.filename)):
                    # Create a save to use filename
                    filename = checkFileName(secure_filename(file.filename))
                    # Save file
                    file.save(os.path.join(Config.UPLOAD_DIRECTORY, filename))
                    # create db entry
                    with psycopg2.connect(host=Config.POSTGRES_HOST, dbname=Config.POSTGRES_DBNAME, user=Config.POSTGRES_USER, password=Config.POSTGRES_PASS, port=Config.POSTGRES_PORT) as con:
                        emailCode = random.randrange(9999999, 999999999)

                        sampleEmail = "joe@joecompany.com"
                        currentTime = str(datetime.datetime.now())

                        cursor = con.cursor()
                        # cursor.execute("INSERT INTO stickers (stickerLat, stickerLon, logoId, pictureUrl, adderEmail) VALUES (%s,%s,%s,%s,%s)", (request.form['lat'], request.form['lon'], request.form['logoId'], os.path.join(Config.UPLOAD_DIRECTORY, filename), emailCode))
                        cursor.execute("INSERT INTO stickers (stickerLat, stickerLon, logoId, pictureUrl, adderEmail, postTime, spots, boardYear, verified) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)", (request.form['lat'], request.form['lon'], 1, os.path.join(Config.UPLOAD_DIRECTORY, filename), emailCode, currentTime, 0, request.form['boardYear'], 1))
                        con.commit()
                        return json.dumps({'status': '200', 'error': 'Sticker added to database.', 'emailCode': emailCode}), 200
                else:
                    return json.dumps({'status': '400', 'error': 'Unsupported file type.'}), 400
            else:
                return json.dumps({'status': '400', 'error': 'You must upload a picture.'}), 400
        else:
            return json.dumps({'status': '400', 'error': 'Location or logo not defined.'}), 400
    else:
        return json.dumps({'status': '405', 'error': 'HTTP Method not allowed.'}), 405

@app.route('/addEmail', methods=['PATCH'])
def addEmail():
    if request.form['email'] != '':
        if request.form['token'] != '':
            # Check if the token is in the database
            with psycopg2.connect(host=Config.POSTGRES_HOST, dbname=Config.POSTGRES_DBNAME, user=Config.POSTGRES_USER, password=Config.POSTGRES_PASS, port=Config.POSTGRES_PORT) as con:
                cursor = con.cursor()
                result = cursor.execute('SELECT * FROM stickers WHERE adderEmail=%s', (request.form['token'],)).fetchall()
                if len(result) != 0:
                    # Change email in database
                    cursor.execute('UPDATE stickers SET adderEmail = %s WHERE adderEmail = %s', (request.form['email'], request.form['token']))
                    con.commit()
                    return json.dumps({'status': '200', 'error': 'Email updated in database.'}), 200
                else:
                    return json.dumps({'status': '400', 'error': 'Token not valid.'}), 400
        else:
            return json.dumps({'status': '400', 'error': 'Token not defined.'}), 400
    else:
        return json.dumps({'status': '400', 'error': 'Email not defined'}), 400

@app.route('/getStickers', methods=['GET'])
def getStickers():
    if (request.args.get('west') != '' and request.args.get('east') != '' and request.args.get('north') != '' and request.args.get('south') != ''):
        # Get all the stickers within the bounding box
        with psycopg2.connect(host=Config.POSTGRES_HOST, dbname=Config.POSTGRES_DBNAME, user=Config.POSTGRES_USER, password=Config.POSTGRES_PASS, port=Config.POSTGRES_PORT) as con:
            # create cursor
            cursor = con.cursor()
            # find results
            cursor.execute("SELECT * FROM stickers WHERE stickerLat BETWEEN %s AND %s AND stickerLon BETWEEN %s AND %s", (request.args.get('south'), request.args.get('north'), request.args.get('west'), request.args.get('east')))
            
            rows = cursor.fetchall()
            
            return json.dumps(rows, default=str)
    else:
        return json.dumps({'status': '400', 'error': 'Bounding box not defined or incomplete.'}), 400

@app.route('/getNearYouStickers', methods=['GET'])
def getNearYouStickers():
    if (request.args.get('lon') != '' and request.args.get('lat') != ''):
        # Get all the stickers within the bounding box
        with psycopg2.connect(host=Config.POSTGRES_HOST, dbname=Config.POSTGRES_DBNAME, user=Config.POSTGRES_USER, password=Config.POSTGRES_PASS, port=Config.POSTGRES_PORT) as con:
            cursor = con.cursor()

            cursor.execute("""SELECT *, ST_DistanceSphere(
                ST_MakePoint(%s, %s),
                ST_MakePoint(stickerLon, stickerLat)
            ) AS distance
            FROM stickers
            ORDER BY distance ASC
            LIMIT 10""", (float(request.args.get('lon')), float(request.args.get('lat'))))

            rows = cursor.fetchall()
            
            return json.dumps(rows, default=str)
    else:
        return json.dumps({'status': '400', 'error': 'Bounding box not defined or incomplete.'}), 400


@app.route('/getUnverifiedStickers', methods=['GET'])
def getUnverifiedStickers():
    # Get all unverified stickers'
    with psycopg2.connect(host=Config.POSTGRES_HOST, dbname=Config.POSTGRES_DBNAME, user=Config.POSTGRES_USER, password=Config.POSTGRES_PASS, port=Config.POSTGRES_PORT) as con:
        # create cursor
        cursor = con.cursor()
        # find results
        rows = cursor.execute("SELECT * FROM stickers WHERE verified=0").fetchall()
        return json.dumps(rows)

@app.route('/setSticker', methods=['GET'])
def setSticker():
    if request.args.get("id") == None or request.args.get('state') == None:
        return json.dumps({'status': '400', 'error': 'Invalid or missing arguments.'})
    with psycopg2.connect(host=Config.POSTGRES_HOST, dbname=Config.POSTGRES_DBNAME, user=Config.POSTGRES_USER, password=Config.POSTGRES_PASS, port=Config.POSTGRES_PORT) as con:
        # create a cursor
        cursor = con.cursor()
        # Get the email address of the user
        if request.args.get('state') == 'Verify':
            # Update db
            cursor.execute("UPDATE stickers SET verified=1 WHERE stickerId=%s", (request.args.get('id'), ))
            con.commit()
            # sendEmailUpdate
            return json.dumps({'status': '200', 'error': 'Card updated'})

        if request.args.get('state') == 'Reject':
            # Update db
            cursor.execute("UPDATE stickers SET verified=-1 WHERE stickerId=%s", (request.args.get('id'), ))
            con.commit()
            return json.dumps({'status': '200', 'error': 'Card updated'})
        return json.dumps({'status': '400', 'error': 'Invalid card state'})

@app.route('/updateStickerSpots', methods=['POST'])
def updateStickerSpots():
    data = request.get_json()
    stickerID = data.get('stickerID')

    if (stickerID != ''):
        # Get all the stickers within the bounding box
        with psycopg2.connect(host=Config.POSTGRES_HOST, dbname=Config.POSTGRES_DBNAME, user=Config.POSTGRES_USER, password=Config.POSTGRES_PASS, port=Config.POSTGRES_PORT) as con:
            # create cursor
            cursor = con.cursor()
            # Increase spot count
            cursor.execute("UPDATE stickers SET spots = spots + 1 WHERE stickerID = %s", (stickerID,))
            
            return json.dumps({'status': '200', 'error': 'Updated spots count'}), 200
    else:
        return json.dumps({'status': '400', 'error': 'Updating sticker spots failed'}), 400

def allowed_file(filename):
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

def checkFileName(name):
    newName = name
    counter = 0
    while os.path.exists(os.path.join(Config.UPLOAD_DIRECTORY, newName)):
        newName = name.split('.')[0] + str(counter) + '.' + name.split('.')[1]
        counter += 1
    return newName

if __name__ == "__main__":
    app.run(port=7050, debug=True)
