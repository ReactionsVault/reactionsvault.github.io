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
    reaction.setState(() => {
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
        this.removeMedium = this.removeMedium.bind(this);
        this.onDrop = this.onDrop.bind(this);
        this.onDragOver = this.onDragOver.bind(this);
        this.onDragEnter = this.onDragEnter.bind(this);
        this.onPast = this.onPast.bind(this);
    }

    async updateMatchingMedia(tagsKeys: number[]) {
        this.matchingMedia.length = 0;

        if (tagsKeys.length === 0) {
            tagsKeys = [globalThis.db.defaultTagID];
        }

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

                const matchingMedium: MatchingMedium = {
                    id: mediumID,
                    content: file as string,
                };
                if (medium.tags.length === 1) {
                    this.matchingMedia.unshift(matchingMedium);
                } else {
                    this.matchingMedia.push(matchingMedium);
                }
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
        this.updateMatchingMedia([globalThis.db.defaultTagID]);
        this.updateAllTagArray();
    }

    removeMedium(mediumID: number) {
        const matchingID = this.matchingMedia.findIndex((medium) => medium.id === mediumID);
        this.matchingMedia.splice(matchingID, 1);
        this.setState((state: State) => {
            return { matchingMediaVersion: state.matchingMediaVersion + 1 };
        });
    }

    async uploadFileInternal(file: File): Promise<void> {
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

            this.updateMatchingMedia([globalThis.db.defaultTagID]);
            uploadDataBase();
        }
    }

    async uploadImage(): Promise<void> {
        const fileElement = this.fileRef.current as HTMLInputElement;
        if (!!fileElement.files && fileElement.files.length > 0) {
            const file = fileElement.files[0];
            this.uploadFileInternal(file);
        }
    }

    onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.stopPropagation();
        e.preventDefault();
    };

    onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.stopPropagation();
    };

    onDrop(ev: React.DragEvent<HTMLDivElement>) {
        ev.preventDefault();
        ev.stopPropagation();
        if (ev.dataTransfer.items) {
            [...ev.dataTransfer.items].forEach((item) => {
                // If dropped items aren't files, reject them
                if (item.kind === 'file') {
                    const file = item.getAsFile();
                    if (!!file) this.uploadFileInternal(file);
                }
            });
        } else {
            // Use DataTransfer interface to access the file(s)
            [...ev.dataTransfer.files].forEach((file) => {
                this.uploadFileInternal(file);
            });
        }
    }

    onPast(ev: React.ClipboardEvent<HTMLDivElement>) {
        let file = ev.clipboardData.files[0];
        if (!!file) {
            ev.preventDefault();
            ev.stopPropagation();
            this.uploadFileInternal(file);
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
                content.push(
                    <Reaction
                        key={medium.id}
                        removeMedium={this.removeMedium}
                        mediumID={medium.id}
                        img={medium.content}
                    />
                ); //key is used by react to track objects
            }

            return content;
        };
        return (
            <div onDrop={this.onDrop} onDragEnter={this.onDragEnter} onDragOver={this.onDragOver} onPaste={this.onPast}>
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
                        onClick={() => ((this.fileRef.current as HTMLInputElement).value = '')}
                        type="file"
                        id="add_reaction"
                        style={{ visibility: 'hidden' }}
                        accept=".mp4, .gif, image/png, image/jpeg"
                    />
                </div>
                <div>{mediaContent()}</div>
            </div>
        );
    }
}
