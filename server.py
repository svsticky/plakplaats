import flask
from flask import request
from flask import render_template
import sqlite3
import json
import os
from werkzeug.utils import secure_filename
import random

app = flask.Flask(__name__)


COLOR = "#800816"
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
def stickyMap():
	return render_template('home.html', color=COLOR)

@app.route('/upload', methods=['GET', 'POST'])
def uploadSticker():
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
	with sqlite3.connect('stickers.db') as con:
		cursor = con.cursor()
		results = cursor.execute('SELECT * FROM logos ORDER BY logoTitle DESC').fetchall()
		return json.dumps(results)

@app.route('/addEmail', methods=['PATCH'])
def addEmail():
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

if __name__ == "__main__":
	from waitress import serve
	serve(app, host='0.0.0.0', port='7050')
