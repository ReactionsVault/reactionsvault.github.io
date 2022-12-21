import '../css/style.css';
import * as React from 'react';

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
