import { DropboxError, DROPBOX_APP } from './dropbox_common';
import * as DropboxAPI from 'dropbox';
import { Authenticate, AuthData } from '../interfaces/auth_interface';
import { REDIRECT_URI, CLIENT_ID } from './app_dropbox';

export class DropboxAuth implements Authenticate {
    private dbxAuth: DropboxAPI.DropboxAuth;
    private dbx: DropboxAPI.Dropbox | null = null;

    constructor() {
        this.dbxAuth = new DropboxAPI.DropboxAuth({
            clientId: CLIENT_ID,
        });
    }

    GetDropboxAuth(): DropboxAPI.DropboxAuth {
        return this.dbxAuth;
    }
    SetDropbox(dbx: DropboxAPI.Dropbox) {
        this.dbx = dbx;
    }

    async RequestLogin() {
        var authUrl = await this.dbxAuth.getAuthenticationUrl(
            REDIRECT_URI, // redirectUri - A URL to redirect the user to after authenticating. This must be added to your app through the admin interface.
            DROPBOX_APP, // state - State that will be returned in the redirect URL to help prevent cross site scripting attacks.
            'code', // authType - auth type, defaults to 'token', other option is 'code'

            /* tokenAccessTyp - type of token to request.  From the following:
             * null - creates a token with the app default (either legacy or online)
             * legacy - creates one long-lived token with no expiration
             * online - create one short-lived token with an expiration
             * offline - create one short-lived token with an expiration with a refresh token*/
            'offline',

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
        );
        window.sessionStorage.clear();
        window.sessionStorage.setItem('codeVerifier', this.dbxAuth.getCodeVerifier());
        window.location.href = String(authUrl);
    }

    async GetOAuthAccessToken(oauth_code: string): Promise<AuthData> {
        var sessionCode = window.sessionStorage.getItem('codeVerifier');
        if (!!!sessionCode) {
            throw DropboxError('There is no codeVerifier. Call RequestLogin() first');
        }

        this.dbxAuth.setCodeVerifier(sessionCode);
        var login = (await this.dbxAuth.getAccessTokenFromCode(REDIRECT_URI, oauth_code)).result as any;
        return { access_token: login.access_token, refresh_token: login.refresh_token };
    }

    async Login(access_token: string, refresh_token: string): Promise<void> {
        this.dbxAuth.setAccessToken(access_token);
        this.dbxAuth.setRefreshToken(refresh_token);
        this.dbxAuth.setClientId(CLIENT_ID);

        this.dbx = new DropboxAPI.Dropbox({
            auth: this.dbxAuth,
        });

        var response = await this.dbx.usersGetCurrentAccount();
        if (!!!response?.result.account_id) {
            throw DropboxError('Login() failed');
        }
    }
}
