from twitchAPI.twitch import Twitch
from twitchAPI.types import InvalidRefreshTokenException
from twitchAPI.oauth import UserAuthenticator, refresh_access_token
from quart import Quart, render_template, websocket, copy_current_websocket_context
from enum import Enum

import dateutil.parser

import json
import os
import aiohttp
import asyncio

import yaml

app = Quart(__name__)

with open("config.yaml") as fl:
    config = yaml.load(fl, Loader=yaml.FullLoader)

USER_ID = config["USER_ID"]
POLL_FREQUENCY = config["POLL_FREQUENCY"]

CLIENT_ID = config["CLIENT_ID"]
CLIENT_SECRET = config["CLIENT_SECRET"]

NEVER_CACHE_TWITCH = config.get("NEVER_CACHE_TWITCH", False)

DEBUG = config["DEBUG"]

twitch_secrets = {
    "TOKEN": None,
    "REFRESH_TOKEN": None,
}


secrets_fn = "twitch_secrets.json"


def update_twitch_secrets(new_data):
    with open(secrets_fn, "w+") as fl:
        fl.write(json.dumps(new_data))


def load_twitch_secrets():
    with open(secrets_fn) as fl:
        return json.loads(fl.read())


file_list = os.listdir()

if not secrets_fn in file_list:
    update_twitch_secrets(twitch_secrets)
else:
    twitch_secrets = load_twitch_secrets()


def callback(uuid, payload):
    print(payload)


TOKEN = twitch_secrets["TOKEN"]
REFRESH_TOKEN = twitch_secrets["REFRESH_TOKEN"]


headers = {"content-type": "application/json"}

twitch = Twitch(CLIENT_ID, CLIENT_SECRET)
twitch.session = None


# setting up Authentication and getting your user id
twitch.authenticate_app([])

# Gotta do this when the lib doesn't support it yet
class extra_scopes(Enum):
    CHANNEL_READ_POLLS = "channel:read:polls"


target_scope = [extra_scopes.CHANNEL_READ_POLLS]

auth = UserAuthenticator(twitch, target_scope, force_verify=False)

if (not TOKEN) or (not REFRESH_TOKEN) or (NEVER_CACHE_TWITCH):
    # this will open your default browser and prompt you with the twitch verification website
    TOKEN, REFRESH_TOKEN = auth.authenticate()
else:
    try:
        TOKEN, REFRESH_TOKEN = refresh_access_token(
            REFRESH_TOKEN, CLIENT_ID, CLIENT_SECRET
        )
    except InvalidRefreshTokenException:
        TOKEN, REFRESH_TOKEN = auth.authenticate()


twitch_secrets["TOKEN"] = TOKEN
twitch_secrets["REFRESH_TOKEN"] = REFRESH_TOKEN
update_twitch_secrets(twitch_secrets)

poll_feeds = set()


@app.route("/")
async def index():
    return await render_template("index.html")


async def poll_receiving():
    # Nothing doing.
    while True:
        data = await websocket.receive()


@app.websocket("/")
async def control_room_websocket():
    obj = websocket._get_current_object()

    poll_feeds.add(obj)

    consumer = asyncio.ensure_future(
        copy_current_websocket_context(poll_receiving)(),
    )
    try:
        await asyncio.gather(consumer)
    finally:
        consumer.cancel()
        poll_feeds.remove(obj)


async def poll():
    session = aiohttp.ClientSession()
    url = f"https://api.twitch.tv/helix/polls?broadcaster_id={USER_ID}"
    print(f"Polling every {POLL_FREQUENCY} seconds...")

    while True:
        async with session.get(
            url, headers={"Authorization": f"Bearer {TOKEN}", "Client-Id": CLIENT_ID}
        ) as r:
            resp = await r.json()

        await process_data(resp)

        await asyncio.sleep(POLL_FREQUENCY)


async def process_data(data):
    data = data["data"]

    if not data:
        return

    current_poll = max(data, key=lambda x: dateutil.parser.parse(x["started_at"]))

    processed_poll = {
        "title": current_poll["title"],
        "is_running": current_poll["status"] == "ACTIVE",
        "started": dateutil.parser.parse(current_poll["started_at"]).timestamp() * 1000,
        "duration": current_poll["duration"] * 1000,
        "choices": [
            [
                c["id"],
                c["title"],
                sum([c["votes"], c["channel_points_votes"], c["bits_votes"]]),
            ]
            for c in current_poll["choices"]
        ],
    }

    await send_poll_data(processed_poll)


async def send_poll_data(payload):
    data = json.dumps(payload)

    for ws in poll_feeds:
        await ws.send(data)


loop = asyncio.get_event_loop()
loop.create_task(app.run_task())
loop.create_task(poll())

try:
    loop.run_forever()
finally:
    loop.run_until_complete(loop.shutdown_asyncgens())
    loop.close()
