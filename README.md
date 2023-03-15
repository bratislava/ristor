# @bratislava/ristor

A command line utility that fetches the latest database backup from Azure and runs restore `psql` command.

![image](video.gif)

## Usage
1. Clone this repository.
2. Install packages:
```
yarn
```
3. Authenticate. This opens a browser window with login screen, after the login close the browser. Your Azure cookies will be stored in `cookies.txt`.
```
yarn run login
```
4. Run the command and follow the instructions. `psql` must be available from your machines env path.
```
yarn run
```

## Contribute
To add more projects / environments edit `defs.js`.