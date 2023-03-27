# @bratislava/ristor

A command line utility that fetches the latest database backup from Azure and runs restore `psql` command.

![image](video.gif)

## Usage
1. Clone this repository.
2. Install packages:
```
yarn
```
3. Authenticate. This opens a browser window with login screen, after the login close the browser (and make sure the process does not keep running in the background). Your Azure cookies will be stored using `keytar`.
```
yarn login
```
4. Run the command and follow the instructions. `psql` must be available from your machines env path.
```
yarn ristor
```

## Contribute
To add more projects / environments edit `defs.js`.