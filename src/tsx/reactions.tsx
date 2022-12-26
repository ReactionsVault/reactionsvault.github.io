import * as React from 'react';
import { Reaction } from './reaction';

import { DownloadResult, FileInfo, FileSystemStatus, FileUploadMode, UploadResult } from '../interfaces/fs_interface';
import { uploadDataBase } from '../db_common';

import { ReactTags } from 'react-tag-autocomplete';

import { TagsContainer } from '../tagsContainer';

import { TagSuggestion } from 'react-tag-autocomplete';

class State {
    matchingMediaVersion = 0;
    selectedTagsVersion = 0;
    tags: TagSuggestion[] = [];
}

class MatchingMedium {
    id = -1;
    content = '';
}

function callbackTagsChanged(reaction: Reactions) {
    reaction.setState((state: State) => {
        return { tags: Array.from(globalThis.tags.getTags()) };
    });
}

export class Reactions extends React.Component {
    fileRef: React.RefObject<HTMLInputElement>;

    fileCache: Map<string, string> = new Map<string, string>();
    matchingMedia: MatchingMedium[] = [];
    selectedTags: TagSuggestion[] = [];

    constructor(props: any) {
        super(props);
        this.state = new State();

        this.fileRef = React.createRef();
        this.uploadImage = this.uploadImage.bind(this);
        this.onSelectTag = this.onSelectTag.bind(this);
        this.onUnselectTag = this.onUnselectTag.bind(this);
    }

    async updateMatchingMedia(tagsKeys: number[]) {
        this.matchingMedia.length = 0;

        const matchingMedia = await globalThis.db.getMediaID(tagsKeys);
        for (let mediumID of matchingMedia) {
            let medium = await globalThis.db.getMedium(mediumID);
            if (!!medium) {
                var file = this.fileCache.get(medium.name);
                if (!!!file) {
                    const downloadResult = (await globalThis.system?.fs.downloadFile(medium.name)) as DownloadResult;
                    if (!!downloadResult.file && !!downloadResult.file.content) {
                        const urlObject = URL.createObjectURL(downloadResult.file.content);
                        this.fileCache.set(medium.name, urlObject);
                        file = urlObject;
                    }
                }
                this.matchingMedia.push({
                    id: mediumID,
                    content: file as string,
                });
                this.setState((state: State) => {
                    return { matchingMediaVersion: state.matchingMediaVersion + 1 };
                });
            }
        }
    }

    async updateAllTagArray() {
        globalThis.tags = new TagsContainer();
        await globalThis.tags.loadTags();
        globalThis.tags.registerCallback(this, callbackTagsChanged);
        callbackTagsChanged(this);
    }

    async componentDidMount() {
        this.updateMatchingMedia([1]);
        this.updateAllTagArray();
    }

    async uploadImage(): Promise<void> {
        const fileElement = this.fileRef.current as HTMLInputElement;
        if (!!fileElement.files && fileElement.files.length > 0) {
            const file = fileElement.files[0];
            if (!!file) {
                var result = (await globalThis.system?.fs.uploadFile(
                    '/' + file.name,
                    { content: file },
                    FileUploadMode.Add
                )) as UploadResult;

                if (result.status !== FileSystemStatus.Success) {
                    throw Error('Couldnt upload medium, status: ' + result.status);
                }

                await globalThis.db.addMedium((result.fileInfo as FileInfo).name as string);

                this.updateMatchingMedia([1]);
                uploadDataBase();
            }
        }
    }

    onSelectTag(tag: TagSuggestion) {
        this.selectedTags.push(tag);
        this.updateMatchingMedia(this.selectedTags.map((tag) => tag.value as number));
        this.setState((state: State) => {
            return { selectedTagsVersion: state.selectedTagsVersion + 1 };
        });
    }

    onUnselectTag(tagIndex: number) {
        this.selectedTags.splice(tagIndex, 1);
        this.updateMatchingMedia(this.selectedTags.map((tag) => tag.value as number));
        this.setState((state: State) => {
            return { selectedTagsVersion: state.selectedTagsVersion + 1 };
        });
    }

    render() {
        if (!!!globalThis.tags) {
            globalThis.tags = new TagsContainer();
        }
        const mediaContent = () => {
            let content = [];

            for (let medium of this.matchingMedia) {
                content.push(<Reaction key={medium.id} mediumID={medium.id} img={medium.content} />); //key is used by react to track objects
            }

            return content;
        };
        return (
            <div>
                <div>
                    <ReactTags
                        onAdd={this.onSelectTag}
                        onDelete={this.onUnselectTag}
                        selected={this.selectedTags}
                        suggestions={(this.state as State).tags}
                        allowBackspace={true}
                        closeOnSelect={true}
                    />
                    <label htmlFor="add_reaction">Add reaction</label>
                    <input
                        ref={this.fileRef}
                        onChange={this.uploadImage}
                        type="file"
                        id="add_reaction"
                        style={{ visibility: 'hidden' }}
                        accept=".mp4, .gif, image/png, image/jpeg"
                    />
                </div>
                <div style={{ width: '30%' }}>{mediaContent()}</div>
            </div>
        );
    }
}
