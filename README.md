# sticker-map

Plak je kwak, en upload er een foto van.<br>
This webapp lets your members add all the locations they sticked a sticker of your association.

## Installation

Clone this repo. Then, copy `sample.env` to `.env` and you just need to fill in any empty credentials. These can be found in our
Bitwarden. Then install the correct python version and the dependencies using [uv](https://docs.astral.sh/uv/getting-started/installation/).

```bash
cd sticker-map/
cp sample.env .env
uv sync
```

The program uses a Postgres database. For this database to work you need to install Postgres locally on your machine.
Additionally, you need to install the PostGIS extension for Postgres locally. This can be done by opening the 'PgAdmin4' program and navigating to your database and then to the 'stickers' table.
Using the query tool on your 'stickers' table, execute the following query: 'CREATE EXTENSION postgis;'. This will install PostGIS locally.

## Executing the program

Running this program works by running the flask app.
This can be done in two ways. Execute one of the following commands in your terminal:

```bash
uv run server.py

# Or

uv venv
flask --app server.py --debug run
# or
flask --app server.py run
```
