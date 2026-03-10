import flask
from flask import request
from flask import jsonify
from flask import render_template
from flask import flash
from sqlalchemy import create_engine, select, and_, update
from sqlalchemy.orm import Session
from geoalchemy2.functions import ST_MakePoint, ST_DistanceSphere
from models import User as UserModel, Sticker, Admin as AdminModel, Base
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
from jwt import decode as jwt_decode

from flask_jwt_extended import current_user
from flask_jwt_extended import JWTManager
from flask_jwt_extended import verify_jwt_in_request, set_access_cookies, create_access_token

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
from wtforms import Form, IntegerField, StringField
from wtforms.validators import InputRequired, Optional

from flask import send_from_directory

load_dotenv()

class Config:
    # Flask config
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY")

    # OIDC info
    OIDC_ISSUER_BASE   = os.getenv("KOALA_URL")
    OIDC_CLIENT_ID     = os.getenv("KOALA_CLIENT_UID")
    OIDC_CLIENT_SECRET = os.getenv("KOALA_CLIENT_SECRET")
    OIDC_SCOPES        = os.getenv("OIDC_SCOPES")

    # Flask‑JWT‑Extended config
    JWT_PUBLIC_KEY       = None   # gets filled in at startup
    JWT_SECRET_KEY      = os.getenv("JWT_SECRET_KEY")
    JWT_TOKEN_LOCATION   = ["cookies"]
    JWT_ACCESS_COOKIE_PATH = "/"
    JWT_COOKIE_SECURE    = os.getenv("STICKER_MAP_URL").startswith("https://")
    JWT_CSRF_IN_COOKIES  = False
    JWT_COOKIE_CSRF_PROTECT = False
    JWT_ACCESS_COOKIE_NAME = "access_token_cookie"
    JWT_ACCESS_TOKEN_EXPIRES = datetime.timedelta(hours=8)

    # Postgres config
    DATABASE_URL = os.getenv("DATABASE_URL")

    # Miscellaneous
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    UPLOAD_DIRECTORY = "./static/uploads"
    STICKER_MAP_PORT = os.getenv("STICKER_MAP_PORT")

if (not os.path.exists(Config.UPLOAD_DIRECTORY)):
    os.mkdir(Config.UPLOAD_DIRECTORY)

engine = create_engine(Config.DATABASE_URL)
Base.metadata.create_all(engine)

class AdminIndex(AdminIndexView):
    @expose('/')
    def index(self):
        with Session(engine) as session:
            new_stickers = session.query(Sticker).filter_by(reviewed=False).order_by(Sticker.posttime.asc()).all()
        return self.render('admin/index.html', stickers=new_stickers)

    def is_accessible(self):
        verify_jwt_in_request()
        return is_admin_user(current_user.sub) or current_user.is_super_admin

    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for('stickerMap'))

class AdminForm(Form):
    sub = IntegerField('OIDC Subject', validators=[InputRequired()])
    email = StringField('Email', validators=[Optional()])

class StickerAdmin(ModelView):
    # Sort by newest posttime default
    column_default_sort = ('posttime', True)

    def is_accessible(self):
        verify_jwt_in_request()
        return is_admin_user(current_user.sub) or current_user.is_super_admin
    
    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for('stickerMap'))

class SuperAdminView(ModelView):
    column_list = ("sub", "email")
    form_excluded_columns = ("id",)
    column_default_sort = ("sub", False)

    form = AdminForm

    def is_accessible(self):
        verify_jwt_in_request()
        return current_user.is_super_admin
    
    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for('stickerMap'))

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
    index_view=AdminIndex(),
)

admin.add_view(StickerAdmin(Sticker, db_session, name="Stickers", endpoint="stickers"))
admin.add_view(SuperAdminView(AdminModel, db_session, name="Admins", endpoint="admins"))

admin.add_link(MenuLink(name='Main Site', url='/', category=''))
admin.add_link(MenuLink(name='Logout', url='/logout', category=''))

disc = requests.get(f"{app.config['OIDC_ISSUER_BASE']}/.well-known/openid-configuration", verify=True).json()
jwks = requests.get(disc["jwks_uri"], verify=True).json()
koala_public_key = RSAAlgorithm.from_jwk(json.dumps(jwks["keys"][0]))

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

def is_admin_user(sub: int) -> bool:
    with Session(engine) as session:
        stmt = select(AdminModel).where(AdminModel.sub == sub)
        return session.execute(stmt).first() is not None
    
def can_review_stickers() -> bool:
    return is_admin_user(current_user.sub) or current_user.is_super_admin

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        approved = is_admin_user(current_user.sub) or current_user.is_super_admin
        if not approved:
            if request.is_json or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'error': 'You are no longer an admin. Redirecting to home page.'}), 403
            # For regular browser requests, redirect the user
            flash('You are no longer an admin', 'warning')
            return redirect(url_for('stickerMap'))
        return fn(*args, **kwargs)
    return wrapper

def super_admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        approved = current_user.is_super_admin
        if not approved:
            return "User does not have super admin rights", 403
        return fn(*args, **kwargs)
    return wrapper

# ─── Frontend Routes ─────────────────────────────────────────────
@app.route('/')
@login_required
def stickerMap():
    is_admin = is_admin_user(current_user.sub) or current_user.is_super_admin
    return render_template('home.html', username=f"{current_user.full_name} (#{current_user.sub})", is_admin=is_admin)

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

    # Decode id_token
    jwt_data = jwt_decode(id_token, key=koala_public_key, algorithms=["RS256"], audience=Config.OIDC_CLIENT_ID)

    # Create new access token from jwt_data
    plakplaats_access_token = create_access_token(
        jwt_data['sub'], 
        additional_claims={
            "email": jwt_data['email'],
            "is_admin": jwt_data['is_admin'],
            "full_name": jwt_data['full_name']})

    resp = flask.make_response(redirect(next_url))
    set_access_cookies(resp, plakplaats_access_token)

    upsert_user(
        int(jwt_data["sub"]),
        jwt_data["full_name"],
        jwt_data["email"]
    )
    return resp

def upsert_user(sub, full_name, email):
    with Session(engine) as session:
        user = session.get(UserModel, sub)

        if user is None:
            # Create new user
            session.add(
                UserModel(
                    sub=sub,
                    name=full_name,
                    email=email
                )
            )
        else:
            # Update fields if they changed
            if user.name != full_name:
                user.name = full_name

            if user.email != email:
                user.email = email

        session.commit()

# ─── Backend routes ───────────────────────────────────────────────────
@app.route('/upload', methods=['GET', 'POST'])
@login_required
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
                        sticker = Sticker(
                            longitude  = float(request.form['lon']),
                            latitude   = float(request.form['lat']),
                            picture    = os.path.join(Config.UPLOAD_DIRECTORY, filename),
                            sub        = current_user.sub,
                            boardyear  = request.form['boardYear'],
                            verified   = False
                        )

                        session.add(sticker)
                        session.commit()
                        return json.dumps({'status': '200', 'error': 'Sticker added to database.'}), 200
                else:
                    return json.dumps({'status': '400', 'error': 'Unsupported file type.'}), 400
            else:
                return json.dumps({'status': '400', 'error': 'You must upload a picture.'}), 400
        else:
            return json.dumps({'status': '400', 'error': 'Location not defined.'}), 400
    else:
        return json.dumps({'status': '405', 'error': 'HTTP Method not allowed.'}), 405

@app.route('/getStickers', methods=['GET'])
@login_required
def getStickers():
    if (
        request.args.get('west') != '' and
        request.args.get('east') != '' and
        request.args.get('north') != '' and
        request.args.get('south') != ''
    ):
        # Get all the stickers within the bounding box
        west = float(request.args.get('west'))
        east = float(request.args.get('east'))
        north = float(request.args.get('north'))
        south = float(request.args.get('south'))

        with Session(engine) as session:
            stmt = (
                select(Sticker, UserModel)
                .join(UserModel, Sticker.sub == UserModel.sub)
                .where(and_(
                    Sticker.latitude.between(south, north),
                    Sticker.longitude.between(west, east),
                    Sticker.verified
                ))
            )

            rows = session.execute(stmt).all()

            out = []
            for sticker, user in rows:
                out.append({
                    'id': sticker.id,
                    'latitude': float(sticker.latitude) if sticker.latitude is not None else None,
                    'longitude': float(sticker.longitude) if sticker.longitude is not None else None,
                    'picture_url': sticker.picture if sticker.picture is not None else None,
                    'sub': sticker.sub,
                    'username': user.name,
                    'posttime': sticker.posttime,
                    'spots': sticker.spots,
                    'boardyear': sticker.boardyear,
                    'verified': sticker.verified
                })

            return jsonify(out), 200

    else:
        return jsonify({
            'status': 400,
            'error': 'Bounding box not defined or incomplete.'
        }), 400

@app.route('/getNearYouStickers', methods=['GET'])
@login_required
def getNearYouStickers():
    if (request.args.get('lon') != '' and request.args.get('lat') != ''):
        # Get all the stickers within the bounding box
        with Session(engine) as session:
            stmt = select(Sticker, UserModel).join(UserModel, Sticker.sub == UserModel.sub).where(Sticker.verified).order_by(ST_DistanceSphere(
                ST_MakePoint(float(request.args.get('lon')), float(request.args.get('lat'))), 
                ST_MakePoint(Sticker.longitude, Sticker.latitude)).asc()
            ).limit(10)

            rows = session.execute(stmt).all()

            out = []
            for sticker, user in rows:
                out.append({
                    'id': sticker.id,
                    'latitude': float(sticker.latitude) if sticker.latitude is not None else None,
                    'longitude': float(sticker.longitude) if sticker.longitude is not None else None,
                    'picture_url': sticker.picture if sticker.picture is not None else None,
                    'sub': sticker.sub,
                    'username': user.name,
                    'posttime': sticker.posttime,
                    'spots': sticker.spots,
                    'boardyear': sticker.boardyear,
                    'verified': sticker.verified
                })
            return jsonify(out), 200
    else:
        return json.dumps({'status': '400', 'error': 'Bounding box not defined or incomplete.'}), 400

@app.route('/updateStickerSpots', methods=['POST'])
@login_required
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
@admin_required
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
        sticker.verified = approved
        session.commit()
        return jsonify({'status': 'ok'}), 200

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
    serve(app, host='0.0.0.0', port=Config.STICKER_MAP_PORT)
