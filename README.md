# Plakplaats

Plak je kwak, en upload er een foto van.<br>
This webapp lets your members add all the locations they sticked a sticker of your association.

## Installation

1. Clone this repository
2. Copy `sample.env` to `.env`. This can be done in two ways:
   - Manually through the file explorer
   - In the terminal through `cp sample.env .env`
3. Fill in all the empty credentials in the newly created `.env` file. These can be found in our Bitwarden
4. Install [uv](https://docs.astral.sh/uv/getting-started/installation/)
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

## Upgrading to a new board year

Upgrading to a new board year is done with the following steps (see commit `ef9a79a` for an example of this upgrade):

In `home.html`:

1. Add a new option inside `<select id="boardYearInputSelect" name="boardYearInputSelect">`, by duplicating the last option. Then change this new option to `<option value="<current-board-number>" selected>B<current-board-number></option>` and remove the `selected` tag from the one second-to-last option item.

In general.css:

2. Add a new variable called `--board-<previous-board-number>-color` and set its value to the current value of `--board-color`
3. Set the value of `--board-color` equal to the new current board color

In home.css:

4. Change the background of `#boardYearInputSelect option:nth-child(<previous-board-number>), .marker-B<previous-board-number>` from `background: var(--board-<previous-board-number>-color);` to `background: var(--board-<current-board-number>-color);`. Add a new declaration `#boardYearInputSelect option:nth-child(<current-board-number>), .marker-B<current-board-number>` with the value `background: var(--board-color);`.

In `/img/markers`:

5. Create a new svg by copying a `marker-<board-number>.svg` file and call this new file `marker-<current-board-number>.svg`. Open the text content of this new svg file and search (`ctrl+f`) for `#`. This should return two results of `fill="#<hex-color>"`. Replace both these hex colors with the new current board color.

In `/img`:

6. Similarly to `4.`, open `favicon.svg` and search (`ctrl+f`) for `#`. This should return one result of `fill="#<hex-color>"`. Replace this hex color with the new current board color. Convert this `favicon.svg` to an `favicon.ico` and replace the current favicon with this new `favicon.ico`. This conversion can be done with online services, such as [Picflow Svg to Ico](https://picflow.com/convert/svg-to-ico) (these online services do differ in quality, so check if the result for example has the transparant background the current favicon has). Do note that browser sometimes do not update the favicon image on a reload. Opening an incognito window or clearing the browser cache can help in this case.