import * as React from 'react';
import { FileInfo, FileSystemStatus, FileUploadMode, UploadResult } from '../interfaces/fs_interface';
import { uploadDataBase } from '../db_common';

export class Reactions extends React.Component {
    tagNameRef: React.RefObject<HTMLInputElement>;
    fileRef: React.RefObject<HTMLInputElement>;

    constructor(props: any) {
        super(props);
        this.state = {
            activeTags: [] as number[],
        };

        this.tagNameRef = React.createRef();
        this.fileRef = React.createRef();

        this.addTag = this.addTag.bind(this);
        this.uploadImage = this.uploadImage.bind(this);
    }

    async addTag() {
        const tagNameElement = this.tagNameRef.current as HTMLInputElement;
        const tagName = tagNameElement.value;
        if (!!tagName) {
            tagNameElement.value = '';

            await globalThis.db.addTag(tagName);
            uploadDataBase();
        }
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
                uploadDataBase();
            }
        }
    }

    render() {
        return (
            <div>
                <div>
                    <input
                        ref={this.fileRef}
                        onChange={this.uploadImage}
                        type="file"
                        id="reaction"
                        name="reaction"
                        accept=".pptx, image/png, image/jpeg"
                    />
                </div>
                <div>
                    <input ref={this.tagNameRef} type="text" id="tag" />
                    <button id="add_tag" onClick={this.addTag}>
                        Add
                    </button>
                </div>
            </div>
        );
    }
}
