## Coggle Issue Importer

### What is it?

Coggle issue importer is a node.js demo application for the Coggle API that imports all the issues from a selected GitHub repository into a Coggle, grouped by their tags.

The user is authenticated for both the Coggle API and the Github API using OAuth. The [passport-coggle-oauth2](https://github.com/coggle/passport-coggle-oauth2) module used to authorize users with Coggle, and retrieve an access token that can be sent along with requests to prove that your application is allowed to access a user's Coggles.

### Try It [Here](http://github2coggle.herokuapp.com)!

### Get the Code!

First install [node.js](http://nodejs.org/download/), then:
```bash
git clone git@github.com:Coggle/coggle-issue-importer.git
cd coggle-issue-importer
npm install
```

### Running Coggle Issue Importer

To use the Coggle API you need a Client ID, and a Client Secret – which Coggle uses to identify requests to the applications that made them.

A new Client ID and Client Secret can be created at
[http://coggle.it/developer](http://coggle.it/developer). The redirect URL
should be the domain (and optionally port) where you will host the application
(for example, `localhost` or `localhost:5000` for testing) followed by
`/auth/coggle/callback`, which is the Coggle oauth authentication callback
route of the app.

Since the app also uses the GitHub API, you also need a github API client ID
and client secret (get one
[here](https://github.com/settings/applications/new)). The callback URL for
github authorization is (as you'd expect) the domain followed by
`/auth/github/callback`.

Both these pairs of IDs and secrets then need to be provided as environment
variables when you run the app. If they are missing the app will refuse to
start – but if they are incorrect you will only find out when you try to use
it!

```bash
COGGLE_CLIENT_ID=aaaaaaaaaaaaaaaaaaaaaaaa \
COGGLE_CLIENT_SECRET=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb \
GITHUB_CLIENT_ID=cccccccccccccccccccc \
GITHUB_CLIENT_SECRET=dddddddddddddddddddddddddddddddddddddddd \
node app.js
```


### License
[The MIT License](http://opensource.org/licenses/MIT)


