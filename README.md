# The Subway Arrivals Sign API
The subway arrivals sign is a CircuitPython-powered LED sign which displays the upcoming train arrivals at the subway stations of your choosing! This repository contains the code for the API backend of the sign. The API pulls serialized data from the [MTA Realtime Data Feeds](https://api.mta.info/#/landing), and repackages it into a far-simplified, JSON payload that can be used by the [sign itself](https://github.com/dzaharia1/subway-sign-python).

## Project overview
The subway arrivals sign needs three overall components in place to get up and running:
1. The subway arrivals sign API (this repository)
2. [The subway arrivals web app](https://github.com/dzaharia1/subway-sign-app), which is the front-end that you will use to configure which stations your sign tracks, and other settings, like when it should turn off at night and turn on in the morning
3. [The subway sign itself](https://github.com/dzaharia1/subway-sign-python), which runs on a wifi-enabled CircuitPython board custom-made to drive the an LED matrix.

This tutorial will cover the setup of the API, which I recommend getting up and running first. Visit the web app and sign repositories (in that order) for instructions on setting those components up as well.

## A bit more about this API
This Node.js-based API has two jobs: it stores the settings information for each sign using a Postgres database and then uses that settings information to serve up fresh, sign-specific information to the sign on request. You will give each sign you make a unique four-letter code, which the API will use to interpret the sign's settings and drive the sign's behavior.

You can also build two signs, configure them to use the same four-letter code, and voila– two signs that will behave identically, and can be configured from one place. This will all make more sense as we proceed through the tutorial.

To get the API running, you'll need the following:
- Node.js version 18 or later
- [Postico](https://eggerapps.at/postico2/) (for setting up and managing your database)
- A way to run your code in the cloud. [Heroku](heroku.com) deployment will serve as the basis for this tutorial
- A PostgreSQL database in the cloud. Again, Heroku will be the basis for this tutorial.
- An API key from the [MTA Realtime Data Feeds](https://api.mta.info/#/landing)

### Sign up for Heroku, and an MTA API key
First, we need an environment on which to run our API and app. I have found Heroku to be an invaluable, easy to use, and cost effective platform for apps. Sign up at heroku.com. Once signed up, install the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli).

Next, we need access to the subway data that will power our sign. The MTA graciously makes this data available to the public. Before getting started, give the [usage guidelines](https://api.mta.info/#/DataFeedAgreement) a read. It's the shortest, most no-nonsense usage guidelines you'll probably ever see.

Now, [create an account](https://api.mta.info/#/signup) to get access. Once your registration is complete, log in and click on "Access Key" in the page header to access your key. You just got access to the feed information for the New York City Subway. Pretty cool!
<!-- 
### 2. Sign up for Heroku
Heroku is a cloud environment for deploying and running apps, just like this one. We're going to use it to host the API itself, the database, and the subway sign app, which you will use to configure your sign. Heroku is not a requirement for this project, but _some_ hosting platform will be. So feel free to translate these instructions to the platform[s] of your choice.

1. Go to heroku.com to sign up or log in -->

### Download the code and push it to Heroku
Open up a terminal on your local machine. Create the directory you want to work within for this project using the `mkdir` command.

```bash
$ mkdir subway-sign
```

Now navigate to the directory where you want to work on this project using the `cd` command, like so:

```bash
$ cd subway-sign
```

Now clone this repository into your working directory using `git clone`

```bash
$ git clone https://github.com/dzaharia1/subway-schedules.git
$ cd subway-schedules
```

This will download the entire codebase of the API to your local machine, which you will then push to Heroku to run it.

Now, create your app on Heroku. replace `<API APP NAME>` with a unique name for the API for your subway sign:
```bash
$ heroku create -a <API APP NAME>
```

The command will prompt you to log into Heroku. Follow that prompt to continue.
Your working directory now has two remote repositories. One on github, called `origin`, and one on Heroku, called `heroku`. We'll push to `heroku` to get the app deployed. The app _will_ fail at first, because we haven't set up the database yet. We'll take care of that in our next step.

```bash
git push heroku master
```

The app is now running! It just needs a database to store information on your sign. For that, we'll create our database.


### Set up your database

The database is not used to store or cache subway feed information. Instead, it will be used to store the settings and tracked stations for each of your signs. I architected the project this way to avoid using the onboard storage of the chip that powers the sign. This way, I could service, or even exchange, the code on the board, or the board itself without having to re-input all of my configuration.

Go to your application's dashboard on Heroku by logging in with the browser, and clicking on `<API APP NAME>` in the applications list.

On the Resources tab, under Add-ons, search "postgres," and click on "Heroku Postgres." An overlay will appear letting you order the service. Confirm and continue.

On the Settings tab, under Config Vars, check to see that the DATABASE_URL config variable has been added. While we're here, let's add the MTA Realtime API key we registered for earlier. Go fetch that key from the MTA website you used earlier to register. Back on the settings page for your Heroku app, create a new config variable with the key `MTA_API_KEY`. For the value, paste your API key.

Install Postico to access and manage your new database. Click on New Server from URL in the postico app. Copy the value for DATABASE_URL from the `<API APP NAME>` dashboard, and paste it in the dialog in Postico. Then click "Connect" in the dialog that appears on the right side of the screen. You may have to confirm the database's certificate to continue.

On the left side, click on "SQL Query" under the "Queries" tab, and past the following query into the editor:
```SQL
CREATE TABLE signs (
    sign_id text NOT NULL,
    stations text[] NOT NULL,
    direction text,
    minimum_time integer DEFAULT 0,
    rotating boolean DEFAULT true,
    max_arrivals_to_show integer DEFAULT 6,
    shutoff_schedule boolean DEFAULT false,
    turnon_time time without time zone,
    turnoff_time time without time zone,
    warn_time integer DEFAULT 1,
    sign_on boolean DEFAULT true,
    rotation_time integer DEFAULT 6
);
```
Now click on the refresh button on the top right of the Postico window, and click on "signs" under the Tables tab on the left. On the bottom of the screen, click on "content." You should see an empty database, with columns for the sign ID, stations, and all of the sign's settings.

### Add your first sign to the database
Back in the SQL Query editor, paste the following query to initialize your first sign. Replace `<SIGN ID>` with any four-letter ID for your sign:
```SQL
INSERT INTO "public"."signs"("sign_id","stations","direction","minimum_time","rotating","max_arrivals_to_show","shutoff_schedule","turnon_time","turnoff_time","warn_time","sign_on","rotation_time")
VALUES
(E'<SIGN ID>',E'{901,631,723}',E'S',5,TRUE,4,TRUE,E'07:00:00',E'22:30:00',6,TRUE,4);
```
Visit the `signs` table again by clicking on it on the left side. Then click refresh on the top right of the Postico window, and you should see your sign appear, with a few default values. From within the subway sign app, you'll be able to edit each and every one of these values except for the sign ID. Changing the sign ID will break the connection between your sign and your API.

### Time to test!
Ok so we got the API deployed, and a database created. What about the live subway data itself, AKA the GOODS!? The default configuration I've given you above creates a sign that tracks all downtown departures from Grand Central station. Let's look at the live data and weep! Go to https://`<APP API NAME>`.herokuapp.com/sign/`<SIGN ID>` and you'll see the sign's settings, as well as the first four south-bound departures from Grand Central Station. It should look very similar to the output below:
```JSON
[
  {
    "rotating": true,
    "numArrivals": 4,
    "shutOffSchedule": true,
    "turnOnTime": "07:00:00",
    "shutOffTime": "22:30:00",
    "warnTime": 6,
    "signOn": true,
    "rotationTime": 4
  },
  {
    "minutesUntil": 5,
    "stopId": "723S",
    "routeId": "7",
    "headsign": "34 St-Hudson Yards"
  },
  {
    "minutesUntil": 5,
    "stopId": "723S",
    "routeId": "7",
    "headsign": "34 St-Hudson Yards"
  },
  {
    "minutesUntil": 7,
    "stopId": "631S",
    "routeId": "4",
    "headsign": "Crown Hts-Utica Av"
  },
  {
    "minutesUntil": 8,
    "stopId": "631S",
    "routeId": "6",
    "headsign": "Brooklyn Bridge-City Hall"
  }
]
```

Voila! We have a running API! Next, head to the [Subway Sign App](https://github.com/dzaharia1/subway-sign-app) repo to deploy the application which you will use to set up and manage your sign.