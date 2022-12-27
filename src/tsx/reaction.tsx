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
    imgFile: Blob | null = null;
}

function callbackTagsChanged(reaction: Reaction) {
    reaction.setState(() => {
        return { tags: Array.from(globalThis.tags.getTags()) };
    });
}

export class Reaction extends React.Component<Props, State> {
    selectedTags: TagSuggestion[] = [];
    videoRef: React.RefObject<HTMLVideoElement>;

    constructor(props: any) {
        super(props);
        this.state = new State();

        this.videoRef = React.createRef();
        this.onSelectTag = this.onSelectTag.bind(this);
        this.onUnselectTag = this.onUnselectTag.bind(this);
        this.onDeleteReaction = this.onDeleteReaction.bind(this);
        this.onClickReaction = this.onClickReaction.bind(this);
        this.onMouseEnterVideo = this.onMouseEnterVideo.bind(this);
        this.onMouseLeaveVideo = this.onMouseLeaveVideo.bind(this);
    }

    async onDeleteReaction() {
        const tagsDeleted = await globalThis.db.removeMedium(this.props.mediumID);
        globalThis.tags.removeTagsByID(tagsDeleted);
        if (tagsDeleted.length > 0) {
            uploadDataBase();
        }

        if (!!this.props.removeMedium) this.props.removeMedium(this.props.mediumID);
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

        await globalThis.db.linkTagToMedium(tag.value as number, this.props.mediumID);
        uploadDataBase();

        this.selectedTags.push(tag);

        this.setState((state: State) => {
            return { selectedTagsVersion: state.selectedTagsVersion + 1 };
        });
    }

    onClickReaction() {
        if (!!this.props.imgFile) {
            switch (this.props.imgFile.type) {
                case 'image/png':
                    navigator.clipboard.write([
                        new ClipboardItem({
                            'image/png': this.props.imgFile,
                        }),
                    ]);
                    break;
                case 'image/gif':
                case 'video/mp4':
                    const link = document.createElement('a');
                    link.href = this.props.img;
                    link.download = 'reaction';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    break;
                default:
                    throw Error('Unknown file type to copy: ' + this.props.imgFile.type);
            }
        }
    }

    onMouseEnterVideo() {
        if (!!this.videoRef.current) this.videoRef.current.muted = false;
    }

    onMouseLeaveVideo() {
        if (!!this.videoRef.current) this.videoRef.current.muted = true;
    }

    //input is id in selected
    async onUnselectTag(tagIndex: number) {
        const tag = this.selectedTags[tagIndex] as TagSuggestion;
        const tagDeleted = await globalThis.db.unlinkTagToMedium(tag.value as number, this.props.mediumID);
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
        const mediumID = this.props.mediumID;
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
        const click_icon = this.props.imgFile?.type === 'image/png' ? '/copy_icon.png' : '/download_icon.png';
        const reaction =
            this.props.imgFile?.type === 'video/mp4' ? (
                <video ref={this.videoRef} style={{ width: '100%', height: 'auto' }} autoPlay muted loop>
                    <source src={this.props.img} type="video/mp4" />
                </video>
            ) : (
                <img src={this.props.img} alt="loading" />
            );
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
                    {reaction}
                    <div
                        className="overlay-container"
                        onClick={this.onClickReaction}
                        onMouseEnter={this.onMouseEnterVideo}
                        onMouseLeave={this.onMouseLeaveVideo}>
                        <img className="overlay-icon" src={click_icon} />
                    </div>
                    <button onClick={this.onDeleteReaction}>Delete</button>
                </div>
            </div>
        );
    }
}
