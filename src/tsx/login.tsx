import * as React from 'react';
import { Dropbox } from '../dropbox/dropbox';

class Props {
    loginEnabled: boolean = false;
}

export class Login extends React.Component<Props, {}> {
    render() {
        function LoginDropbox() {
            var dropbox = new Dropbox();
            dropbox.auth.RequestLogin();
        }

        return (
            <div>
                <button id="dropbox-sign-in" onClick={LoginDropbox} disabled={!this.props.loginEnabled}>
                    dropbox log in
                </button>
            </div>
        );
    }
}
