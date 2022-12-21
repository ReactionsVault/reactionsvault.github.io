import '../css/style.css';
import * as React from 'react';
import { Dropbox } from '../dropbox/dropbox';

class Reaction extends React.Component {
    constructor(props: any) {
        super(props);
    }

    render() {
        return (
            <div>
                <div>
                    <input type="text" />
                </div>
                <div className="medium">
                    <img src="https://media.sproutsocial.com/uploads/meme-example.jpg" width="500px" />
                    <button>Delete</button>
                </div>
            </div>
        );
    }
}

class Login extends React.Component {
    render() {
        function LoginDropbox() {
            var dropbox = new Dropbox();
            dropbox.auth.RequestLogin();
        }

        return (
            <div>
                <button id="dropbox-sign-in" disabled={true} onClick={LoginDropbox}>
                    dropbox log in
                </button>
            </div>
        );
    }
}

class Reactions extends React.Component {
    constructor(props: any) {
        super(props);
        this.state = {
            activeTags: [] as number[],
        };
    }

    render() {}
}

class App extends React.Component {}
