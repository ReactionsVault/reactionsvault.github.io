import * as React from 'react';
import { Reaction } from './reaction';
import { Tags } from './tags';
import { TagsContainer } from '../tagsContainer';

import { DownloadResult, FileInfo, FileSystemStatus, FileUploadMode, UploadResult } from '../interfaces/fs_interface';
import { uploadDataBase } from '../db_common';

const SUPPORTED_FORMATS = new Set(['image/png', 'image/jpeg', 'image/gif', 'video/mp4']);

class State {
    matchingMediaVersion = 0;
    selectedTagsVersion = 0;
}

class MatchingMedium {
    id = -1;
    contentURL = '';
    contentFile: Blob | null = null;
}

class MatchingMediumCache {
    contentURL = '';
    contentFile: Blob | null = null;
}

export class Reactions extends React.Component {
    fileRef: React.RefObject<HTMLInputElement>;
    tagsRef: React.RefObject<Tags>;

    fileCache: Map<string, MatchingMediumCache> = new Map<string, MatchingMediumCache>();
    matchingMedia: MatchingMedium[] = [];

    constructor(props: any) {
        super(props);
        this.state = new State();

        this.fileRef = React.createRef();
        this.tagsRef = React.createRef();

        this.uploadImage = this.uploadImage.bind(this);
        this.onSelectTag = this.onSelectTag.bind(this);
        this.onDeselectTag = this.onDeselectTag.bind(this);
        this.removeMedium = this.removeMedium.bind(this);
        this.onDrop = this.onDrop.bind(this);
        this.onDragOver = this.onDragOver.bind(this);
        this.onDragEnter = this.onDragEnter.bind(this);
        this.onPaste = this.onPaste.bind(this);
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
                        if (!SUPPORTED_FORMATS.has(downloadResult.file.content.type)) {
                            throw Error('Unknown file type for reaction: ' + downloadResult.file.content.type);
                        }

                        const urlObject = URL.createObjectURL(downloadResult.file.content);
                        const fileCacheObject: MatchingMediumCache = {
                            contentURL: urlObject,
                            contentFile: downloadResult.file.content,
                        };

                        this.fileCache.set(medium.name, fileCacheObject);
                        file = fileCacheObject;
                    }
                }

                const matchingMedium: MatchingMedium = {
                    id: mediumID,
                    contentURL: file?.contentURL as string,
                    contentFile: file?.contentFile as Blob,
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
            if (!SUPPORTED_FORMATS.has(file.type)) {
                throw Error('Wrong file type to upload as reaction: ' + file.type);
            }
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
                    if (!!file) {
                        if (SUPPORTED_FORMATS.has(file.type)) {
                            this.uploadFileInternal(file);
                        }
                    }
                }
            });
        } else {
            // Use DataTransfer interface to access the file(s)
            [...ev.dataTransfer.files].forEach((file) => {
                if (SUPPORTED_FORMATS.has(file.type)) {
                    this.uploadFileInternal(file);
                }
            });
        }
    }

    onPaste(ev: React.ClipboardEvent<HTMLDivElement>) {
        let file = ev.clipboardData.files[0];
        if (!!file) {
            if (SUPPORTED_FORMATS.has(file.type)) {
                ev.preventDefault();
                ev.stopPropagation();
                this.uploadFileInternal(file);
            }
        }
    }

    onSelectTag() {
        const selectedTags = this.tagsRef.current?.getSelectedTags();
        if (!!!selectedTags) return;

        this.updateMatchingMedia(selectedTags.map((tag) => tag.value as number));
        this.setState((state: State) => {
            return { selectedTagsVersion: state.selectedTagsVersion + 1 };
        });
    }

    onDeselectTag() {
        const selectedTags = this.tagsRef.current?.getSelectedTags();
        if (!!!selectedTags) return;

        this.updateMatchingMedia(selectedTags.map((tag) => tag.value as number));
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
                        img={medium.contentURL}
                        imgFile={medium.contentFile}
                    />
                ); //key is used by react to track objects
            }

            return content;
        };
        return (
            <div
                onDrop={this.onDrop}
                onDragEnter={this.onDragEnter}
                onDragOver={this.onDragOver}
                onPaste={this.onPaste}>
                <div>
                    <Tags
                        ref={this.tagsRef}
                        availableTags={globalThis.tags.getTags()}
                        selectTagCallback={this.onSelectTag}
                        deselectTagCallback={this.onDeselectTag}
                    />
                    <label htmlFor="add_reaction">
                        <img src="/add_reaction_icon.png" style={{ width: '10%', cursor: 'pointer' }} />
                    </label>
                    <input
                        ref={this.fileRef}
                        onChange={this.uploadImage}
                        onClick={() => ((this.fileRef.current as HTMLInputElement).value = '')}
                        type="file"
                        id="add_reaction"
                        style={{ visibility: 'hidden' }}
                        accept={Array.from(SUPPORTED_FORMATS).join(',')}
                    />
                </div>
                <div>{mediaContent()}</div>
            </div>
        );
    }
}
