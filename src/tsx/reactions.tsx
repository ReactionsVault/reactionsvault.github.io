import * as React from 'react';
import { Reaction } from './reaction';

import { FileInfo, FileSystemStatus, FileUploadMode, UploadResult } from '../interfaces/fs_interface';
import { uploadDataBase } from '../db_common';

export class Reactions extends React.Component {
    fileRef: React.RefObject<HTMLInputElement>;

    constructor(props: any) {
        super(props);
        this.state = {
            activeTags: [] as number[],
            reactionsCount: 0,
        };

        this.fileRef = React.createRef();

        this.uploadImage = this.uploadImage.bind(this);
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

                this.setState((state, props) => ({
                    reactionsCount: state.reactionsCount + 1,
                }));
            }
        }
    }
    //URL.createObjectURL(img_file.file.content);
    render() {
        const mediaContent = () => {
            let content = [];
            for (let i = 0; i < this.state.reactionsCount; ++i) {
                content.push(<Reaction key={i} />); //key is used by react to track objects
            }
            return content;
        };

        return (
            <div>
                <div>
                    <input type="text" placeholder="tags..."></input>
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
                {mediaContent()}
            </div>
        );
    }
}
