import '../css/style.css';
import * as React from 'react';
import { uploadDataBase } from '../db_common';
import { Tags, TagObject } from './tags';

class State {
    selectedTagsVersion: number = 0;
}

class Props {
    removeMedium: ((id: number) => void) | null = null;
    mediumID: number = -1;
    img: string = '';
    imgFile: Blob | null = null;
}

export class Reaction extends React.Component<Props, State> {
    videoRef: React.RefObject<HTMLVideoElement>;
    tagsRef: React.RefObject<Tags>;

    initTags: TagObject[] = [];

    constructor(props: any) {
        super(props);
        this.state = new State();

        this.videoRef = React.createRef();
        this.tagsRef = React.createRef();

        this.onSelectTag = this.onSelectTag.bind(this);
        this.onDeselectTag = this.onDeselectTag.bind(this);
        this.onCreateTag = this.onCreateTag.bind(this);
        this.onDeleteReaction = this.onDeleteReaction.bind(this);
        this.onClickReaction = this.onClickReaction.bind(this);
        this.onMouseEnterVideo = this.onMouseEnterVideo.bind(this);
        this.onMouseLeaveVideo = this.onMouseLeaveVideo.bind(this);
    }

    updateSelectedTagsVersion() {
        this.setState((state: State) => {
            return { selectedTagsVersion: state.selectedTagsVersion + 1 };
        });
    }

    async onDeleteReaction() {
        const tagsDeleted = await globalThis.db.removeMedium(this.props.mediumID);
        globalThis.tags.removeTagsByID(tagsDeleted);
        if (tagsDeleted.length > 0) {
            uploadDataBase();
        }

        if (!!this.props.removeMedium) this.props.removeMedium(this.props.mediumID);
    }

    async onSelectTag(tag: TagObject) {
        await globalThis.db.linkTagToMedium(tag.value as number, this.props.mediumID);
        uploadDataBase();

        this.updateSelectedTagsVersion();
    }

    async onDeselectTag(tag: TagObject) {
        const tagDeleted = await globalThis.db.unlinkTagToMedium(tag.value as number, this.props.mediumID);
        uploadDataBase();

        if (tagDeleted) {
            globalThis.tags.removeTag(tag);
        }

        this.updateSelectedTagsVersion();
    }

    async onCreateTag(tagName: string): Promise<TagObject | null> {
        const tagID = await globalThis.db.addTag(tagName);
        let tag = new TagObject(tagName.toLowerCase(), tagID);
        globalThis.tags.addTag(tag);

        return tag;
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

    async componentDidMount() {
        const mediumID = this.props.mediumID;
        const mediumTags = await globalThis.db.getMediumTags(mediumID);
        for (let tag of mediumTags) {
            if (tag.name !== '') {
                this.initTags.push({ value: tag.id, name: tag.name });
            }
        }
        if (this.initTags.length) {
            this.updateSelectedTagsVersion();
        }
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
                    <Tags
                        ref={this.tagsRef}
                        availableTags={globalThis.tags.getTags()}
                        selectTagCallback={this.onSelectTag}
                        deselectTagCallback={this.onDeselectTag}
                        createTagCallback={this.onCreateTag}
                        initTags={this.initTags}
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
