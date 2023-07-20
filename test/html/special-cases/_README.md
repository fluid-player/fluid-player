# Special cases

Templates put here will not appear in the e2e file list, but will be accessible directly by URL in the root of the test server.
These templates should be used to share a link of an issue to an issue when creating a PR.

To avoid conflicts with any naming, always use identifiers that point to the cause, for example:

* Internal issues: `internal-vast-click-tracking-issue.tpl.html`
* Github issues: `issue-215.tpl.html`

These files would be accessible in the following URLs when running the dev server:

* http://localhost:8080/internal-vast-click-tracking-issue.html
* http://localhost:8080/issues-215.html

To use specific static files, please create them in `test/static/special-cases`, no special naming is required.

For more information about how these files are being loaded, check `webpack.config.js`
