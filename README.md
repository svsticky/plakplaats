# Plakplaats
Plak je kwak, en upload er een foto van.<br>
This webapp lets your members add all the locations they sticked a sticker of your association.

## Installation
1. Clone this repository
2. Copy `sample.env` to `.env`. This can be done in two ways:
    - Manually through the file explorer 
    - In the terminal through `cp sample.env .env`
3. Fill in all the empty credentials in the newly created `.env` file. These can be found in our Bitwarden
4. Install the correct python version and [uv](https://docs.astral.sh/uv/getting-started/installation/)
5. Install all the correct versions of the dependencies using `uv sync`
6. The program uses a Postgres database. For this database to work you need to install Postgres locally on your machine.
Additionally, you need to install the PostGIS extension for Postgres locally. This can be done by opening the 'PgAdmin4' program and navigating to your database and then to the 'stickers' table.
Using the query tool on your 'stickers' table, execute the following query: 'CREATE EXTENSION postgis;'. This will install PostGIS locally.
7. To update your database table, run `uv run alembic upgrade head` 

## Executing the program
Running this program works by running the flask app.
This is done through uv. Firstly, your terminal needs to be in the server subfolder using `cd .\server\`. Then run the flask app using the following command:

```bash
uv run server.py
```