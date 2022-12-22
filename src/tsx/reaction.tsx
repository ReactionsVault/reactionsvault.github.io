import '../css/style.css';
import * as React from 'react';

export class Reaction extends React.Component {
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
                    <img src={this.props.img} alt="loading" />
                    <button>Delete</button>
                </div>
            </div>
        );
    }
}
