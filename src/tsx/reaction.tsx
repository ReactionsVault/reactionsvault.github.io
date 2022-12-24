import '../css/style.css';
import * as React from 'react';

import { ReactTags } from 'react-tag-autocomplete';
import { TagWithID } from '../indexeddb/db_indexed';
import { uploadDataBase } from '../db_common';

class TagReactStore {
    value: number | string = -1; //tag ID
    label: string = '';
}

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

    //input is object for suggestions
    //new tags value = name
    async onSelectTag(tag: TagReactStore) {
        const isTagNew = tag.value === tag.label;
        var tagID = tag.value;
        if (isTagNew) {
            tagID = await globalThis.db.addTag(tag.label);
        }

        await globalThis.db.linkTagToMedium(tagID as number, (this.props as any).mediumID);
        uploadDataBase();
        this.setState((state, props) => {
            let newSelected = (state as any).selected;
            newSelected.push(tag);

            if (isTagNew) {
                let newSuggestions = (state as any).suggestions;
                newSuggestions.push({ value: tagID, label: tag.label });
                return { selected: newSelected, suggestions: newSuggestions };
            }
            return { selected: newSelected };
        });
    }

    //input is id in selected
    async onUnselectTag(tagIndex: number) {
        const tag = (this.state as any).selected[tagIndex] as TagReactStore;
        await globalThis.db.unlinkTagToMedium(tag.value as number, (this.props as any).mediumID);
        uploadDataBase();

        this.setState((state, props) => {
            let newSelected = (state as any).selected;
            newSelected.splice(tagIndex, 1);
            return { selected: newSelected };
        });
    }

    async componentDidMount() {
        let tags = await globalThis.db.getAllTags();

        let suggestionsTags: any[] = [];
        for (let tag of tags) {
            if (tag.name !== '') {
                suggestionsTags.push({ value: tag.id, label: tag.name });
            }
        }

        const mediumID = (this.props as any).mediumID;
        const mediumTags = await globalThis.db.getMediumTags(mediumID);
        let selectedTags: any[] = [];
        for (let tag of mediumTags) {
            if (tag.name !== '') {
                selectedTags.push({ value: tag.id, label: tag.name });
            }
        }

        this.setState((state, props) => {
            return { suggestions: suggestionsTags, selected: selectedTags };
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
