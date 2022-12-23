import '../css/style.css';
import * as React from 'react';

import { ReactTags } from 'react-tag-autocomplete';
import { TagWithID } from '../indexeddb/db_indexed';

export class Reaction extends React.Component {
    constructor(props: any) {
        super(props);
        this.state = {
            selected: [] as number[],
            suggestions: [] as any[],
        };

        this.onSelectTag = this.onSelectTag.bind(this);
        this.onUnselectTag = this.onUnselectTag.bind(this);
    }

    onSelectTag(tag: any) {
        console.log(tag);
        this.setState((state, props) => {
            let newSelected = (state as any).selected;
            newSelected.push(tag);
            return { selected: newSelected };
        });
    }

    onUnselectTag(tagIndex: any) {
        console.log(tagIndex);
        this.setState((state, props) => {
            let newSelected = (state as any).selected;
            newSelected.splice(tagIndex, 1);
            return { selected: newSelected };
        });
    }

    async componentDidMount() {
        //let tags = await globalThis.db.getAllTags();
        let tags = [
            { id: 1, name: 'avs' },
            { id: 1, name: 'dupa' },
            { id: 1, name: 'cod' },
            { id: 1, name: 'fdfsdggg' },
            { id: 1, name: 'jjsjaj' },
        ];
        let reactTags = tags.map((tag) => ({
            value: tag.id,
            label: tag.name,
        }));
        this.setState((state, props) => {
            return { suggestions: reactTags };
        });
    }

    render() {
        return (
            <div>
                <div>
                    <ReactTags
                        onAdd={this.onSelectTag}
                        onDelete={this.onUnselectTag}
                        selected={(this.state as any).selected}
                        suggestions={(this.state as any).suggestions}
                        allowBackspace
                        closeOnSelect
                        allowNew
                    />
                </div>
                <div className="medium">
                    <img src={(this.props as any).img} alt="loading" />
                    <button>Delete</button>
                </div>
            </div>
        );
    }
}
