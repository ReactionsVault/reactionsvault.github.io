import * as Dropbox from './dropbox/dropbox';

var auth_app: string | null;
var auth_token: string | null;
function hasAuthData() {
  auth_app = window.localStorage.getItem('auth_app');
  auth_token = window.localStorage.getItem('auth_token');
  return !!auth_app && !!auth_token;
}

if (hasAuthData()) {
  if (auth_app === 'dropbox') {
    Dropbox.dropbox_login(auth_token);
  }
} else {
  const queryString = window.location.search; // Returns:'?q=123'
  // Further parsing:
  const params = new URLSearchParams(queryString);
  // params.get('q') is the number 123
  if (params.get('state') == 'auth_dropbox') {
    var code = params.get('code');
    if (!!code) Dropbox.dropbox_login_code(code);
  }
}
