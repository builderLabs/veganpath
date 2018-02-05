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
SALT_LEN = 64


app.secret_key = 'Q1P08?GXz97MB]JSUQGY_M1'

'''
We keep all our client credentials required for 3rd party
API use (Yelp, Google Maps) server-side and use Flask
to serve/read these.

Using heroku's corsanywhere, we're able to query the new
Yelp Fusion API (which does not natively support CORS
headers or JSONP requests) via the front-end which we do only by
requesting a salted version of our Bearer Token from our
application when a request is initiated.

I detail this approach here:
https://github.com/builderLabs/Yelp-Fusion-JavaScript
'''


def fetchCredentials():
    with open(credFile) as credentials:
        creds = json.load(credentials)
    return creds


def getBearerToken():

    creds = fetchCredentials()

    data = urlencode({
        'client_id': creds['YELP_CLIENT_ID'],
        'client_secret': creds['YELP_CLIENT_SECRET'],
        'grant_type': 'client_credentials',
    })
    headers = {
        'content-type': 'application/x-www-form-urlencoded',
    }
    response = requests.request('POST', yelpAuthUrl, data=data,
                                headers=headers)
    response = response.json()
    return response['access_token']


def makeSalt(len, chars):
    salt = ''.join(random.choice(chars) for x in range(len))
    salt = '-'+salt+'_'
    return salt


@app.route('/')
def main():
    global BEARER_TOKEN
    global SALT
    global SALTED_TOKEN
    BEARER_TOKEN = getBearerToken()
    SALT = makeSalt(SALT_LEN, string.ascii_letters + string.digits)
    SALTED_TOKEN = BEARER_TOKEN[0:int(len(BEARER_TOKEN)/2)] + SALT +\
        BEARER_TOKEN[int(len(BEARER_TOKEN)/2):len(BEARER_TOKEN)]
    return render_template('index.html')


@app.route('/saltydog', methods=['POST'])
def giveItUp():
    outgoing = [{'term1': SALTED_TOKEN},
                {'term2': SALT}]
    return json.dumps(outgoing)


if __name__ == '__main__':
    app.debug = True
    app.run(host='0.0.0.0', port=PORT)
