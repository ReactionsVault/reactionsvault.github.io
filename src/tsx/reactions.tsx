import * as React from 'react';
import { Reaction } from './reaction';

import { FileInfo, FileSystemStatus, FileUploadMode, UploadResult } from '../interfaces/fs_interface';
import { uploadDataBase } from '../db_common';

import { ReactTags } from 'react-tag-autocomplete';

export class Reactions extends React.Component {
    fileRef: React.RefObject<HTMLInputElement>;
    allTags: string[] = [];

    constructor(props: any) {
        super(props);
        this.state = {
            activeTags: [] as number[],
            matchingMedia: [] as any[],
            selected: [] as any[],
            suggestions: [
                { value: 1, label: 'abc' },
                { value: 3, label: 'dbc' },
                { value: 2, label: 'dupa' },
                { value: 40, label: 'dog' },
                { value: 10, label: 'animal' },
            ],
        };

        this.fileRef = React.createRef();
        this.uploadImage = this.uploadImage.bind(this);
        this.onSelectTag = this.onSelectTag.bind(this);
        this.onUnselectTag = this.onUnselectTag.bind(this);
    }

    async updateMatchingMedia(tagsKeys: number[]) {
        const matchingMedia = await globalThis.db.getMediaID(tagsKeys);
        let newState = {
            matchingMedia: [] as any[],
        };
        for (let mediumID of matchingMedia) {
            let medium = await globalThis.db.getMedium(mediumID);
            if (!!medium) {
                globalThis.system?.fs.downloadFile(medium.name).then((downloadResult) => {
                    if (!!downloadResult.file && !!downloadResult.file.content) {
                        newState.matchingMedia.push({
                            key: mediumID,
                            element: URL.createObjectURL(downloadResult.file.content),
                        });
                        this.setState(newState);
                    }
                });
            }
        }
    }

    async updateAllTagArray() {
        //this.allTags = await globalThis.db.getAllTags();

        this.allTags = ['test', 'dupa', 'abc', 'animals'];
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

    onSelectTag(tag) {
        this.setState((state, props) => {
            let newSelected = state.selected;
            newSelected.push(tag);
            return { selected: newSelected };
        });
    }

    onUnselectTag(tagIndex: number) {
        this.setState((state, props) => {
            let newSelected = state.selected;
            newSelected.splice(tagIndex, 1);
            return { selected: newSelected };
        });
    }

    render() {
        const mediaContent = () => {
            let content = [];

            for (let medium of (this.state as any).matchingMedia) {
                content.push(<Reaction key={medium.key} img={medium.element} />); //key is used by react to track objects
            }

            return content;
        };
        return (
            <div>
                <div>
                    <ReactTags
                        onAdd={this.onSelectTag}
                        onDelete={this.onUnselectTag}
                        selected={this.state.selected}
                        suggestions={this.state.suggestions}
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
