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
                    <img width="500px" alt="loading" />
                    <button>Delete</button>
                </div>
            </div>
        );
    }
}
