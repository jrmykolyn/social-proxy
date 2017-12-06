# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

## [0.1.0] - 2017-12-06
### Added
- Added configuration/setup files: `README.md`; `CHANGELOG.md`; `package.json`; `.editorconfig`.
- Added the following dependencies: `express`; `pg`; `pg-hstore`; `sequelize`; `curl`; `bluebird`; `ejs`.
- Added the following development dependencies: `gulp`; `gulp-sass`; `sfco-path-map`.
- Added `start` script to `package.json`.
- Added `index.js` file (eg. application entry point).
- Built out initial routes and template rendering logic.
- Completed first pass of Instagram integration (NOTE: access is 'read only').
- Completed first pass of Slack integration (NOTE: access is 'write only').
- Completed first pass of error/invalid request handling/logging.
- Added `src/` and `dist/` directories.
- Completed first pass of `gulpfile.js`.

### Changed
- Updated (Instagram) data fetching logic to correctly handle expired access tokens.
