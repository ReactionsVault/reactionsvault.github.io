export class AuthData {
    access_token: string;
    refresh_token: string;
}

export interface AuthInterface {
    RequestLogin(): void; // opens system's login page
    GetOAuthAccessToken(oauth_code: string): Promise<AuthData>;
    Login(access_token: string, refresh_token: string): Promise<void>;
}
