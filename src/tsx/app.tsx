import * as React from 'react';
import ReactDOM from 'react-dom/client';

import { Dropbox } from '../dropbox/dropbox';
import { DROPBOX_APP } from '../dropbox/dropbox_common';
import { loadDataBase } from '../db_common';

import { Reactions } from './reactions';
import { Login } from './login';

class App extends React.Component<{}, { loggedIn: Boolean }> {
    constructor(props: any) {
        super(props);
        this.state = {
            loggedIn: false,
        };
    }

    async componentDidMount() {
        var loggedIn = false;
        var dropbox: Dropbox | null = null;
        const system_name = window.localStorage.getItem('auth_app');
        if (!!system_name) {
            const access_token = window.localStorage.getItem('auth_access_token');
            const refresh_token = window.localStorage.getItem('auth_refresh_token');
            if (!!access_token && !!refresh_token) {
                switch (system_name) {
                    case DROPBOX_APP:
                        if (dropbox == null) dropbox = new Dropbox();
                        globalThis.system = dropbox;
                        await globalThis.system.auth.Login(access_token, refresh_token);
                        loggedIn = true;
                        break;
                    default:
                        throw Error('Unknown auth_app: ' + system_name);
                }
            } else {
                window.localStorage.removeItem('auth_app');
            }
        }

        if (!loggedIn) {
            const queryString = window.location.search; // Returns:'?q=123'// params.get('q') is the number 123
            const params = new URLSearchParams(queryString);
            const oauth_code = params.get('code');
            if (!!oauth_code) {
                switch (params.get('state')) {
                    case DROPBOX_APP:
                        if (dropbox == null) dropbox = new Dropbox();
                        globalThis.system = dropbox;
                        var tokens = await globalThis.system.auth.GetOAuthAccessToken(oauth_code);
                        window.localStorage.setItem('auth_app', DROPBOX_APP);
                        window.localStorage.setItem('auth_access_token', tokens.access_token as string);
                        window.localStorage.setItem('auth_refresh_token', tokens.refresh_token as string);
                        await globalThis.system.auth.Login(
                            tokens.access_token as string,
                            tokens.refresh_token as string
                        );
                        loggedIn = true;
                        break;
                    default:
                        throw Error('Uknown login app');
                }
            }
        }

        if (loggedIn) {
            loadDataBase();
        }

        this.setState({ loggedIn: loggedIn });
    }
    render() {
        if (this.state.loggedIn) {
            return <Reactions />;
        } else {
            return <Login />;
        }
    }
}

export function renderApp() {
    const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
    root.render(<App />);
}