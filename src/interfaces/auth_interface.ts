export class AuthData {
    access_token: string | null = null;
    refresh_token: string | null = null;
}

export interface Authenticate {
    RequestLogin(): void; // opens system's login page
    GetOAuthAccessToken(oauth_code: string): Promise<AuthData>;
    Login(access_token: string, refresh_token: string): Promise<void>;
}
