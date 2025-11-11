import flask
from flask import request
from flask import jsonify
from flask import render_template
from sqlalchemy import create_engine, select, and_, update
from sqlalchemy.orm import Session
from geoalchemy2.functions import ST_MakePoint, ST_DistanceSphere
from models import Sticker, Base
import requests
import psycopg2
import time
import json
from decimal import Decimal
import os
from werkzeug.utils import redirect, secure_filename
import random
from dotenv import load_dotenv
import secrets
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

from flask_admin import Admin, AdminIndexView, expose
from flask_admin.contrib.sqla import ModelView
from flask_admin.menu import MenuLink
from sqlalchemy.orm import scoped_session, sessionmaker
from models import Sticker

from flask import send_from_directory

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
    UPLOAD_DIRECTORY = "./static/uploads"

if (not os.path.exists(Config.UPLOAD_DIRECTORY)):
    os.mkdir(Config.UPLOAD_DIRECTORY)

engine = create_engine(f"postgresql://{Config.POSTGRES_USER}:{Config.POSTGRES_PASS}@{Config.POSTGRES_HOST}/{Config.POSTGRES_DBNAME}")
Base.metadata.create_all(engine)

class AdminIndex(AdminIndexView):
    @expose('/')
    def index(self):
        with Session(engine) as session:
            new_stickers = session.query(Sticker).filter_by(reviewed=False).order_by(Sticker.posttime.asc()).all()
        return self.render('admin/index.html', stickers=new_stickers)

    def is_accessible(self):
        verify_jwt_in_request()
        adminList = [3, 412]
        approved = (current_user.sub in adminList) or current_user.is_super_admin
        return approved

    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for('login'))

# ─── Flask + JWT init ────────────────────────────────────────────────────
app = Flask(__name__)
app.config.from_object(Config)

# Create scoped session for Flask-Admin
session_factory = sessionmaker(bind=engine)
db_session = scoped_session(session_factory)

# Flask + Admin setup
admin = Admin(
    app,
    name='Plakplaats Admin',
    template_mode='bootstrap3',
    index_view=AdminIndex(),
    base_template='admin/master.html'
)

admin.add_view(ModelView(Sticker, db_session))

admin.add_link(MenuLink(name='Main Site', url='/', category=''))
admin.add_link(MenuLink(name='Logout', url='/logout', category=''))

disc = requests.get(f"{app.config['OIDC_ISSUER_BASE']}/.well-known/openid-configuration", verify=True).json()

jwks = requests.get(disc["jwks_uri"], verify=True).json()
app.config["JWT_PUBLIC_KEY"] = RSAAlgorithm.from_jwk(json.dumps(jwks["keys"][0]))

jwt = JWTManager(app)

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')

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
    adminList = [3, 412]
    is_admin = (current_user.sub in adminList) or bool(current_user.is_super_admin)
    return render_template('home.html', username=current_user.full_name, is_admin=is_admin)

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
        if request.form['lat'] != '' and request.form['lon'] != '':
            if 'image' in request.files and request.files['image'].filename != '':
                file = request.files['image']
                if (file and allowed_file(file.filename)):
                    # Create a save to use filename
                    filename = checkFileName(secure_filename(file.filename))
                    # Save file
                    file.save(os.path.join(Config.UPLOAD_DIRECTORY, filename))
                    # create db entry
                    with Session(engine) as session:
                        emailCode = str(random.randrange(9999999, 999999999))
                        sticker = Sticker(
                            longitude  = float(request.form['lon']),
                            latitude   = float(request.form['lat']),
                            picture    = os.path.join(Config.UPLOAD_DIRECTORY, filename),
                            adderemail = emailCode,
                            boardyear  = request.form['boardYear'],
                            verified   = False
                        )

                        session.add(sticker)
                        session.commit()
                        return json.dumps({'status': '200', 'error': 'Sticker added to database.', 'emailCode': emailCode}), 200
                else:
                    return json.dumps({'status': '400', 'error': 'Unsupported file type.'}), 400
            else:
                return json.dumps({'status': '400', 'error': 'You must upload a picture.'}), 400
        else:
            return json.dumps({'status': '400', 'error': 'Location not defined.'}), 400
    else:
        return json.dumps({'status': '405', 'error': 'HTTP Method not allowed.'}), 405

@app.route('/addEmail', methods=['PATCH'])
def addEmail():
    if request.form['email'] != '':
        if request.form['token'] != '':
            # Check if the token is in the database
            with Session(engine) as session:
                stmt = select(Sticker).where(Sticker.adderemail.is_(request.form['token']))
                sticker = session.query(Sticker).from_statement(stmt).one_or_none()
                if sticker is not None:
                    # Change email in database
                    sticker.adderemail = request.form["email"]
                    session.commit()
                    
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
        with Session(engine) as session:
            stmt = select(Sticker).where(and_(
                Sticker.latitude.between(request.args.get('south'), request.args.get('north')),
                Sticker.longitude.between(request.args.get('west'), request.args.get('east')),
                Sticker.verified,
            ))
            rows = [row[0] for row in session.execute(stmt).all()]
            return json.dumps([row.__dict__ for row in rows], default=str)
    else:
        return json.dumps({'status': '400', 'error': 'Bounding box not defined or incomplete.'}), 400

@app.route('/getNearYouStickers', methods=['GET'])
def getNearYouStickers():
    if (request.args.get('lon') != '' and request.args.get('lat') != ''):
        # Get all the stickers within the bounding box
        with Session(engine) as session:
            stmt = select(Sticker).where(and_(
                Sticker.verified,
            )).order_by(ST_DistanceSphere(
                ST_MakePoint(float(request.args.get('lon')), float(request.args.get('lat'))), 
                ST_MakePoint(Sticker.longitude, Sticker.latitude)).asc()
            ).limit(10)

            rows = [row[0] for row in session.execute(stmt).all()]

            out = []
            for s in rows:
                out.append({
                    'id': s.id,
                    'latitude': float(s.latitude) if s.latitude is not None else None,
                    'longitude': float(s.longitude) if s.longitude is not None else None,
                    'picture_url': s.picture if s.picture is not None else None,
                    'adderemail': s.adderemail,
                    'posttime': s.posttime,
                    'spots': s.spots,
                    'boardyear': s.boardyear,
                    'verified': s.verified
                })
            return jsonify(out), 200
    else:
        return json.dumps({'status': '400', 'error': 'Bounding box not defined or incomplete.'}), 400

@app.route('/updateStickerSpots', methods=['POST'])
def updateStickerSpots():  
    data = request.get_json()
    stickerID = data.get('stickerID')

    if (stickerID != ''):
        # Get all the stickers within the bounding box
        with Session(engine) as session:
            # Increase spot count
            sticker = session.get(Sticker, stickerID)
            sticker.spots += 1

            session.commit()

            return json.dumps({'status': '200', 'error': 'Updated spots count'}), 200
    else:
        return json.dumps({'status': '400', 'error': 'Updating sticker spots failed'}), 400


@app.route('/reviewSticker', methods=['POST'])
def reviewSticker():
    data = request.get_json()
    sticker_id = data.get('stickerID')
    approved = data.get('approved')
    if sticker_id is None:
        return jsonify({'error': 'Sticker ID missing'}), 400

    with Session(engine) as session:
        sticker = session.get(Sticker, sticker_id)
        if not sticker:
            return jsonify({'error': 'Sticker not found'}), 404
        sticker.reviewed = True
        if approved:
            # Approve the sticker
            sticker.verified = True
        else:
            # Disapprove the sticker
            session.verified = False
        session.commit()
        return jsonify({'status': 'ok'}), 200

def sendEmailUpdate():
    return 0  # TODO not implemented

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


# only runs when executed as script, not when used as module
if __name__ == "__main__":
    from waitress import serve
    serve(app, host='0.0.0.0', port='7050')
