import '../css/style.css';
import * as React from 'react';

import { ReactTags } from 'react-tag-autocomplete';
import { uploadDataBase } from '../db_common';
import { TagSuggestion } from 'react-tag-autocomplete';
class State {
    selectedTagsVersion = 0;
    tags: TagSuggestion[] = [];
}

function callbackTagsChanged(reaction: Reaction) {
    reaction.setState((state: State) => {
        return { tags: Array.from(globalThis.tags.getTags()) };
    });
}

export class Reaction extends React.Component {
    selectedTags: TagSuggestion[] = [];

    constructor(props: any) {
        super(props);
        this.state = new State();

        this.onSelectTag = this.onSelectTag.bind(this);
        this.onUnselectTag = this.onUnselectTag.bind(this);
        this.onDeleteReaction = this.onDeleteReaction.bind(this);
    }

    onDeleteReaction() {
        globalThis.db.removeMedium((this.props as any).mediumID);
        (this.props as any).removeMedium((this.props as any).mediumID);
    }

    //input is object for suggestions
    //new tags value = name
    async onSelectTag(tag: TagSuggestion) {
        const isTagNew = tag.value === tag.label;
        var tagID = tag.value;
        if (isTagNew) {
            tagID = await globalThis.db.addTag(tag.label);
        }

        const selectedTag = { value: tagID, label: tag.label };
        if (isTagNew) {
            globalThis.tags.addTag(selectedTag);
        }

        await globalThis.db.linkTagToMedium(tagID as number, (this.props as any).mediumID);
        uploadDataBase();

        this.selectedTags.push(selectedTag);

        this.setState((state: State) => {
            return { selectedTagsVersion: state.selectedTagsVersion + 1 };
        });
    }

    //input is id in selected
    async onUnselectTag(tagIndex: number) {
        const tag = this.selectedTags[tagIndex] as TagSuggestion;
        await globalThis.db.unlinkTagToMedium(tag.value as number, (this.props as any).mediumID);
        uploadDataBase();

        this.selectedTags.splice(tagIndex, 1);
        this.setState((state: State) => {
            return { selectedTagsVersion: state.selectedTagsVersion + 1 };
        });
    }

    async componentDidMount() {
        const mediumID = (this.props as any).mediumID;
        const mediumTags = await globalThis.db.getMediumTags(mediumID);
        for (let tag of mediumTags) {
            if (tag.name !== '') {
                this.selectedTags.push({ value: tag.id, label: tag.name });
            }
        }

        callbackTagsChanged(this);
        globalThis.tags.registerCallback(this, callbackTagsChanged);
    }

    render() {
        return (
            <div>
                <div>
                    <ReactTags
                        onAdd={this.onSelectTag}
                        onDelete={this.onUnselectTag}
                        selected={this.selectedTags}
                        suggestions={(this.state as State).tags}
                        allowBackspace
                        closeOnSelect
                        allowNew
                    />
                </div>
                <div className="medium">
                    <img src={(this.props as any).img} alt="loading" />
                    <button onClick={this.onDeleteReaction}>Delete</button>
                </div>
            </div>
        );
    }
}
