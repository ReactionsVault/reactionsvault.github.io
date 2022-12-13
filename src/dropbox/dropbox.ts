import * as DropboxAPI from 'dropbox';

export var DROPBOX_APP = 'dropbox';
export var DROPBOX_STATE = 'auth_dropbox';
var REDIRECT_URI = 'http://localhost:5173/'; //you need this for redirection, otherwise it just shows Dropbox page with key that you need to enter in app
var CLIENT_ID = 'n5f5arc8a4aa3fq'; //app key
var dbxAuth: DropboxAPI.DropboxAuth;
export var dbx: DropboxAPI.Dropbox;

export function DropboxError(error: any) {
  return { system: 'Dropbox', error };
}

const dropboxSignIn = document.getElementById('dropbox-sign-in');
if (dropboxSignIn != null) dropboxSignIn.addEventListener('click', dropbox_auth);

function dropbox_init_dbxAuth() {
  dbxAuth = new DropboxAPI.DropboxAuth({
    clientId: CLIENT_ID,
  });
}

function dropbox_auth() {
  dropbox_init_dbxAuth();
  dbxAuth
    .getAuthenticationUrl(
      REDIRECT_URI, // redirectUri - A URL to redirect the user to after authenticating. This must be added to your app through the admin interface.
      DROPBOX_STATE, // state - State that will be returned in the redirect URL to help prevent cross site scripting attacks.
      'code', // authType - auth type, defaults to 'token', other option is 'code'

      /* tokenAccessTyp - type of token to request.  From the following:
       * null - creates a token with the app default (either legacy or online)
       * legacy - creates one long-lived token with no expiration
       * online - create one short-lived token with an expiration
       * offline - create one short-lived token with an expiration with a refresh token*/
      'legacy',

      undefined, // scope - scopes to request for the grant

      /* includeGrantedScopes - whether or not to include previously granted scopes.
       * From the following:
       * user - include user scopes in the grant
       * team - include team scopes in the grant
       * Note: if this user has never linked the app, include_granted_scopes must be None*/
      undefined,

      /* usePKCE - Whether or not to use Sha256 based PKCE. PKCE should be only use
       * on client apps which doesn't call your server. It is less secure than non-PKCE flow but
       * can be used if you are unable to safely retrieve your app secret*/
      true
    )
    .then((authUrl: String) => {
      window.sessionStorage.clear();
      window.sessionStorage.setItem('codeVerifier', dbxAuth.getCodeVerifier());
      window.location.href = String(authUrl);
    })
    .catch((error?: any) => console.error(error));
}

export function dropbox_login(access_token: string, callback: Function) {
  if (dbxAuth == null) {
    dropbox_init_dbxAuth();
  }

  dbxAuth.setAccessToken(access_token);
  dbx = new DropboxAPI.Dropbox({
    auth: dbxAuth,
  });

  dbx
    .usersGetCurrentAccount()
    .then(
      (response) => {
        if (!!response.result.account_id) {
          callback(DROPBOX_APP, access_token);
        } else {
          callback(null, null);
        }
      },
      () => {
        callback(null, null);
      }
    )
    .catch((error) => {
      console.error('[Dropbox] Error checking user login status:', error);
    });
}

export function dropbox_login_code(code: string, callback: Function) {
  if (dbxAuth == null) {
    dropbox_init_dbxAuth();
  }

  var sessionCode = window.sessionStorage.getItem('codeVerifier');
  if (!!sessionCode) {
    dbxAuth.setCodeVerifier(sessionCode);
    dbxAuth.getAccessTokenFromCode(REDIRECT_URI, code).then((response) => {
      dropbox_login(response.result.access_token, callback);
    });
  }
}
