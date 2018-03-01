import string
import random
import json
import requests

from urllib import urlencode

import flask
from flask import Flask, render_template, redirect, url_for
from flask import request, jsonify

app = Flask(__name__)

PORT = 5000

yelpAuthUrl = "https://api.yelp.com/oauth2/token"
credFile = "static/assets/docs/credentials"

app.secret_key = 'Q1P08?GXz97MB]JSUQGY_M1'

'''
-We keep all our client credentials required for 3rd party
-API use (Yelp, Google Maps) server-side and use Flask
-to serve/read these.
-
-Using heroku's corsanywhere, we're able to query the new
-Yelp Fusion API (which does not natively support CORS
-headers or JSONP requests) via the front-end which we do only by
-requesting a salted version of our Bearer Token from our
-application when a request is initiated.
-
-I detail this approach here:
-https://github.com/builderLabs/Yelp-Fusion-JavaScript
'''



@app.route('/goYelp', methods=['POST'])
def fetchYelpApiKey():
    with open(credFile) as credentials:
        creds = json.load(credentials)
    return creds['YELP_API_KEY']


@app.route('/')
def main():
    return render_template('index.html')


if __name__ == '__main__':
    app.debug = True
    app.run(host='0.0.0.0', port=PORT)
