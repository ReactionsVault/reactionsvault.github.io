import * as React from 'react';
import { Dropbox } from '../dropbox/dropbox';

export class Login extends React.Component {
    render() {
        function LoginDropbox() {
            var dropbox = new Dropbox();
            dropbox.auth.RequestLogin();
        }

        return (
            <div>
                <button id="dropbox-sign-in" onClick={LoginDropbox}>
                    dropbox log in
                </button>
            </div>
        );
    }
}
