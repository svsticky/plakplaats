import flask
from flask import request
from flask import render_template
import requests
import sqlite3
import time
import json
import os
from werkzeug.utils import redirect, secure_filename
import random
from dotenv import load_dotenv
import secrets

from werkzeug.wrappers import response

#Load env file for variable
load_dotenv()

#Create flask app
app = flask.Flask(__name__)


COLOR = os.getenv("STICKER_MAP_COLOR")
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
UPLOAD_DIRECTORY = "static/uploads"
#COLOR = "#036ffc"

def allowed_file(filename):
	return '.' in filename and \
		filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def checkFileName(name):
	newName = name
	counter = 0
	while os.path.exists(os.path.join(UPLOAD_DIRECTORY, newName)):
		newName = name.split('.')[0] + str(counter) + '.' + name.split('.')[1]
		counter += 1
	return newName

@app.route('/')
def stickerMap():
	if os.getenv('STICKER_MAP_REQUIRE_LOGIN') == "True":
		#Check if cookie is avalable
		if request.cookies.get('token') != None:
			#Check token
			if checkToken(request.cookies.get('token')):
				return render_template('home.html', color=COLOR)
			else:
				return redirect('/auth', code=302)
		else:
			return "redirecting... <script>if(window.localStorage.getItem('token') != null){ document.cookie = 'token=' + window.localStorage.getItem('token'); window.location.reload(); } else { window.location.href = '/auth' }</script>"
	else:
		return render_template('home.html', color=COLOR)

@app.route('/admin', methods=['GET'])
def admin():
	#It is not needed to store or retreive the adminToken from localStorage because it is not intended to survive a new session
	if checkAdminToken(request.cookies.get('adminToken')):
		return render_template('admin.html', color=COLOR)
	else:
		return redirect('/auth?adminRefresh=1')

@app.route('/auth', methods=['GET'])
def auth():
	#The request contains a code after loggin in.
	if request.args.get('code') == None:
		#Check if login with koala is enabled
		if os.getenv("LOGIN_WITH_KOALA") == "True":
			#Construct login url
			url = os.getenv("KOALA_URL") + "/api/oauth/authorize?client_id=" + os.getenv("KOALA_CLIENT_UID") + "&redirect_uri=" + os.getenv("STICKER_MAP_URL") + ":" + os.getenv("STICKER_MAP_PORT") + "/auth&response_type=code"
			resp = flask.make_response(render_template('authKoala.html', color=COLOR, loginUrl=url))
			if request.args.get('adminRefresh') != None:
				resp.set_cookie('adminRefresh', "1")
			return resp
		else:
			return 'Logging in without koala is not yet supported.'
	else:
		#Handle code
		#Create post request to koala server
		tokenUrl = os.getenv("KOALA_URL") + "/api/oauth/token?grant_type=authorization_code&code=" + request.args.get('code') + "&client_id=" + os.getenv("KOALA_CLIENT_UID") + "&client_secret=" + os.getenv("KOALA_CLIENT_SECRET") + "&redirect_uri="+ os.getenv("STICKER_MAP_URL") + ":" + os.getenv("STICKER_MAP_PORT") + "/auth" 
		tokenResponse = json.loads(requests.post(tokenUrl).text)
		#Check if the response is valid, redirect back if not
		if 'credentials_type' not in tokenResponse:
			return redirect('/auth', code=302)
		#Connect to db
		with sqlite3.connect('stickers.db') as con:
			cursor = con.cursor()
			#Check if the user already has (normal) key stored. (Admin refresh session)
			token = ""
			if checkToken(request.cookies.get('token')) == False:
				#Create a (normal) token for user
				token = secrets.token_urlsafe(30)
				cursor.execute("INSERT INTO tokens VALUES (?)", (token,))
			else: 
				#User already has a valid token, re-use this one
				token = request.cookies.get('token')
			#Create a response
			page = "redirecting <script>window.localStorage.setItem('token', '" + token + "'); window.location.href = '../'</script>"
			#Check if the user came from the home page
			if request.cookies.get('adminRefresh') != None:
				page = "redirecting <script>window.localStorage.setItem('token', '" + token + "'); window.location.href = '../admin'</script>"
			resp = flask.make_response(page)
			#Check if the user is a admin
			if tokenResponse['credentials_type'] == "Admin":
				adminToken = secrets.token_urlsafe(30)
				expirationTime = round(time.time()) + int(os.getenv("ADMIN_EXPIRES_IN"))
				cursor.execute("INSERT INTO adminTokens VALUES(?,?)", (adminToken, expirationTime))
				resp.set_cookie('adminToken', adminToken)	
			con.commit()
			#Save token as cookie
			resp.set_cookie('token', token)	
			#Remove the admin redirect token if needed
			resp.set_cookie('adminRefresh', '', expires=0)
			return resp


@app.route('/upload', methods=['GET', 'POST'])
def uploadSticker():
	#Check token if required
	if os.getenv('STICKER_MAP_REQUIRE_LOGIN') == "True":
		if checkToken(request.cookies.get('token') == False):
			return json.dumps({'status' : '403', 'error': 'Not authenticated or cookies disabled.'}), 405
	#Check if request is sent with HTTP Post method
	if request.method == 'POST':
		#Check if all required parameters are available and good
		if request.form['lat'] != '' and request.form['lon'] != '' and request.form['logoId'] != '':
			if 'image' in request.files and request.files['image'].filename != '':
				file = request.files['image']
				if(file and allowed_file(file.filename)):
					#Create a save to use filename
					filename = checkFileName(secure_filename(file.filename))
					#Save file
					file.save(os.path.join(UPLOAD_DIRECTORY, filename))
					#create db entry
					with sqlite3.connect('stickers.db') as con:
						emailCode = random.randrange(9999999,999999999)
						cursor = con.cursor()
						cursor.execute("INSERT INTO stickers (stickerLat, stickerLon, logoId, pictureUrl, adderEmail) VALUES (?,?,?,?,?)", (request.form['lat'], request.form['lon'], request.form['logoId'], os.path.join(UPLOAD_DIRECTORY, filename), emailCode))
						con.commit()
						return json.dumps({'status' : '200', 'error': 'Sticker added to database.', 'emailCode' : emailCode}), 200
				else:
					return json.dumps({'status' : '400', 'error': 'Unsupported file type.'}), 400
			else:
				return json.dumps({'status' : '400', 'error': 'You must upload a picture.'}), 400
		else:
			return json.dumps({'status' : '400', 'error': 'Location or logo not defined.'}), 400
	else:
		return json.dumps({'status' : '405', 'error': 'HTTP Method not allowed.'}), 405

@app.route('/logos', methods=['GET'])
def getLogos():
	#Check token if required
	if os.getenv('STICKER_MAP_REQUIRE_LOGIN') == "True":
		if checkToken(request.cookies.get('token') == False):
			return json.dumps({'status' : '403', 'error': 'Not authenticated or cookies disabled.'}), 405
	with sqlite3.connect('stickers.db') as con:
		cursor = con.cursor()
		results = cursor.execute('SELECT * FROM logos ORDER BY logoTitle DESC').fetchall()
		return json.dumps(results)

@app.route('/editLogo', methods=['PATCH'])
def editLogo():
	#Check if the request contains an valid admin token
	if checkAdminToken(request.cookies.get('adminToken') == False):
		return json.dumps({'status' : '403', 'error': 'Token invalid, expired, or not available'}), 403
	if request.args.get("id") == None or request.args.get('name') == None or request.args.get('color') == None:
		return json.dumps({'status' : '400', 'error': 'Invalid or missing arguments.'}), 400
	with sqlite3.connect('stickers.db') as con:
		cursor = con.cursor();
		cursor.execute('UPDATE logos SET logoTitle=?, logoColor=? WHERE logoId=?',(request.args.get('name'), request.args.get('color'), request.args.get('id')))
		con.commit()
		return json.dumps({'status' : '200', 'error': 'Logo updated!'}), 200

@app.route('/deleteLogo', methods=['DELETE'])
def deleteLogo():
	#Check if the request contains an valid admin token
	if checkAdminToken(request.cookies.get('adminToken') == False):
		return json.dumps({'status' : '403', 'error': 'Token invalid, expired, or not available'}), 403
	if request.args.get("id") == None:
		return json.dumps({'status' : '400', 'error': 'Invalid or missing arguments.'}), 400
	with sqlite3.connect('stickers.db') as con:
		cursor = con.cursor()
		cursor.execute('DELETE FROM logos WHERE logoId=?',(request.args.get('id'),))
		con.commit()
		return json.dumps({'status' : '200', 'error': 'Logo deleted!'}), 200

@app.route('/addLogo', methods=['POST'])
def addLogo():
	#Check if the request contains an valid admin token
	if checkAdminToken(request.cookies.get('adminToken') == False):
		return json.dumps({'status' : '403', 'error': 'Token invalid, expired, or not available'}), 403
	if request.args.get('name') == None or request.args.get('color') == None:
		return json.dumps({'status' : '400', 'error': 'Invalid or missing arguments.'}), 400
	with sqlite3.connect('stickers.db') as con:
		cursor = con.cursor()
		cursor.execute('INSERT INTO logos (logoTitle, logoColor) VALUES (?,?)',(request.args.get('name'), request.args.get('color')))
		con.commit()
		return json.dumps({'status' : '200', 'error': 'Logo added!'}), 200


@app.route('/addEmail', methods=['PATCH'])
def addEmail():
	#Check token if required
	if os.getenv('STICKER_MAP_REQUIRE_LOGIN') == "True":
		if checkToken(request.cookies.get('token') == False):
			return json.dumps({'status' : '403', 'error': 'Not authenticated or cookies disabled.'}), 405
	if request.form['email'] != '':
		if request.form['token'] != '':
			#Check if the token is in the database
			with sqlite3.connect('stickers.db') as con:
				cursor = con.cursor()
				result = cursor.execute('SELECT * FROM stickers WHERE adderEmail=?', (request.form['token'],)).fetchall()
				if len(result) != 0:
					# Change email in database
					cursor.execute('UPDATE stickers SET adderEmail = ? WHERE adderEmail = ?', (request.form['email'], request.form['token']))
					con.commit()
					return json.dumps({'status' : '200', 'error': 'Email updated in database.'}), 200
				else:
					return json.dumps({'status' : '400', 'error': 'Token not valid.'}), 400
		else:
			return json.dumps({'status' : '400', 'error': 'Token not defined.'}), 400
	else:
		return json.dumps({'status' : '400', 'error': 'Email not defined'}), 400

@app.route('/getStickers', methods=['GET'])
def getStickers():
	#Check token if required
	if os.getenv('STICKER_MAP_REQUIRE_LOGIN') == "True":
		if checkToken(request.cookies.get('token') == False):
			return json.dumps({'status' : '403', 'error': 'Not authenticated or cookies disabled.'}), 405
	if(request.args.get('west') != '' and request.args.get('east') != '' and request.args.get('north') != '' and request.args.get('south') != ''):
		#Get all the stickers within the bounding box
		with sqlite3.connect('stickers.db') as con:
			#create cursor
			cursor = con.cursor()
			#find results
			rows = cursor.execute("SELECT * FROM stickers WHERE stickerLat BETWEEN ? AND ? AND stickerLon BETWEEN ? AND ? AND verified='1'", (request.args.get('south'), request.args.get('north'), request.args.get('west'), request.args.get('east'))).fetchall()
			return json.dumps(rows)
	else:
		return json.dumps({'status' : '400', 'error': 'Bounding box not defined or incomplete.'}), 400

@app.route('/getUnverifiedStickers', methods=['GET'])
def getUnverifiedStickers():
	#Check if the request contains an valid admin token
	if checkAdminToken(request.cookies.get('adminToken') == False):
		return json.dumps({'status' : '403', 'error': 'Token invalid, expired, or not available'}), 403
	#Get all unverified stickers'
	with sqlite3.connect('stickers.db') as con:
		#create cursor
		cursor = con.cursor()
		#find results
		rows = cursor.execute("SELECT * FROM stickers WHERE verified=0").fetchall()
		return json.dumps(rows)

@app.route('/setSticker', methods=['GET'])
def setSticker():
	#Check if the request contains an valid admin token
	if checkAdminToken(request.cookies.get('adminToken') == False):
		return json.dumps({'status' : '403', 'error': 'Token invalid, expired, or not available'}), 403
	if request.args.get("id") == None or request.args.get('state') == None:
		return json.dumps({'status' : '400', 'error': 'Invalid or missing arguments.'})
	with sqlite3.connect('stickers.db') as con:
		#create a cursor
		cursor = con.cursor()
		#Get the email address of the user
		if request.args.get('state') == 'Verify':
			#Update db
			cursor.execute("UPDATE stickers SET verified=1 WHERE stickerId=?", (request.args.get('id'), ));
			con.commit();
			#sendEmailUpdate
			return json.dumps({'status' : '200', 'error': 'Card updated'})

		if request.args.get('state') == 'Reject':
			#Update db
			cursor.execute("UPDATE stickers SET verified=-1 WHERE stickerId=?", (request.args.get('id'), ));
			con.commit();
			return json.dumps({'status' : '200', 'error': 'Card updated'})
		return json.dumps({'status' : '400', 'error': 'Invalid card state'})

def sendEmailUpdate():
	return 0;



def checkToken(token):
	if token == None:
		return False
	with sqlite3.connect('stickers.db') as con:
		cursor = con.cursor()
		rows = cursor.execute("SELECT * FROM tokens WHERE token=?", (token,)).fetchall()
		if len(rows	) > 0:
			return True
		else:
			return False

def checkAdminToken(token):
	#Check if the token is not null
	if token == None:
		return False
	#Connect with database	
	with sqlite3.connect("stickers.db") as con:
		#Remove invalid keys from the database
		cursor = con.cursor()
		cursor.execute("DELETE FROM adminTokens WHERE ? > expirationTime", (time.time(),))
		#Check if you key is still in the database
		rows = cursor.execute("SELECT * FROM adminTokens WHERE token = ?", (token, )).fetchall()
		if len(rows	) > 0:
			return True
		else:
			return False


if __name__ == "__main__":
	from waitress import serve
	serve(app, host='0.0.0.0', port='7050')
