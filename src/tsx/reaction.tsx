import '../css/style.css';
import * as React from 'react';

import { ReactTags } from 'react-tag-autocomplete';
import { uploadDataBase } from '../db_common';
import { TagSuggestion } from 'react-tag-autocomplete';
class State {
    selectedTagsVersion = 0;
    tags: TagSuggestion[] = [];
}

class Props {
    removeMedium: ((id: number) => void) | null = null;
    mediumID: number = -1;
    img: string = '';
}

function callbackTagsChanged(reaction: Reaction) {
    reaction.setState(() => {
        return { tags: Array.from(globalThis.tags.getTags()) };
    });
}

export class Reaction extends React.Component<Props, State> {
    selectedTags: TagSuggestion[] = [];

    constructor(props: any) {
        super(props);
        this.state = new State();

        this.onSelectTag = this.onSelectTag.bind(this);
        this.onUnselectTag = this.onUnselectTag.bind(this);
        this.onDeleteReaction = this.onDeleteReaction.bind(this);
    }

    async onDeleteReaction() {
        const tagsDeleted = await globalThis.db.removeMedium((this.props as any).mediumID);
        globalThis.tags.removeTagsByID(tagsDeleted);
        if (tagsDeleted.length > 0) {
            uploadDataBase();
        }

        (this.props as any).removeMedium((this.props as any).mediumID);
    }

    //input is object for suggestions
    //new tags value = name
    async onSelectTag(tag: TagSuggestion) {
        const isTagNew = tag.value === tag.label;
        if (isTagNew) {
            tag.value = await globalThis.db.addTag(tag.label);
            tag.label = tag.label.toLowerCase();
        }

        if (isTagNew) {
            globalThis.tags.addTag(tag);
        }

        await globalThis.db.linkTagToMedium(tag.value as number, (this.props as any).mediumID);
        uploadDataBase();

        this.selectedTags.push(tag);

        this.setState((state: State) => {
            return { selectedTagsVersion: state.selectedTagsVersion + 1 };
        });
    }

    //input is id in selected
    async onUnselectTag(tagIndex: number) {
        const tag = this.selectedTags[tagIndex] as TagSuggestion;
        const tagDeleted = await globalThis.db.unlinkTagToMedium(tag.value as number, (this.props as any).mediumID);
        uploadDataBase();

        this.selectedTags.splice(tagIndex, 1);

        if (tagDeleted) {
            globalThis.tags.removeTag(tag);
        }

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
                <div className="medium" style={{ width: '350px' }}>
                    <img src={(this.props as any).img} alt="loading" />
                    <button onClick={this.onDeleteReaction}>Delete</button>
                </div>
            </div>
        );
    }
}
