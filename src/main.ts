import { dropbox_login_code, dropbox_login } from './dropbox/dropbox';

function logIn_Callback(logged_in: boolean) {
  if (logged_in) {
    const dropboxSignIn = document.getElementById('dropbox-sign-in');
    dropboxSignIn.disabled = true;
  }
}

var auth_app: string | null;
var auth_token: string | null;
function hasAuthData() {
  auth_app = window.localStorage.getItem('auth_app');
  auth_token = window.localStorage.getItem('auth_token');
  return !!auth_app && !!auth_token;
}

if (hasAuthData()) {
  switch (auth_app) {
    case 'dropbox':
      dropbox_login(auth_token, logIn_Callback);
      break;
  }
} else {
  const queryString = window.location.search; // Returns:'?q=123'// params.get('q') is the number 123
  const params = new URLSearchParams(queryString);

  if (params.get('state') === 'auth_dropbox') {
    var code = params.get('code');
    if (!!code) dropbox_login_code(code, logIn_Callback);
  }
}
