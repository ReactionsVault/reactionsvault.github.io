import * as DropboxAPI from 'dropbox';
import { DropboxError } from './dropbox_common';
import { FSInterface, File, FileSystemStatus } from '../interfaces/fs_interface';

function HandleLookupError(path: string, lookupError: DropboxAPI.LookupError) {
    switch (lookupError['.tag']) {
        case 'not_found': //LookupErrorNotFound
            throw DropboxError({
                status: FileSystemStatus.NotFound,
                message: 'HandleLookupError file not found: ' + path,
            });
        default:
            throw DropboxError('Unsupported LookupError type. File: ' + path + ' Tag: ' + lookupError['.tag']);
    }
}

function HandleDownloadError(path: string, downloadError: DropboxAPI.DownloadError): FileSystemStatus {
    switch (downloadError['.tag']) {
        case 'path': //DownloadErrorPath
            try {
                HandleLookupError(path, downloadError.path);
            } catch (error) {
                if (!!error.error.status) {
                    switch (error.error.status) {
                        case FileSystemStatus.NotFound:
                            return FileSystemStatus.NotFound;
                    }
                }
                throw error;
            }
        default:
            throw DropboxError('Unsupported DownloadError type. File: ' + path);
    }
}

function HandleUploadError(path: string, uploadError: DropboxAPI.UploadError): FileSystemStatus {
    switch (uploadError['.tag']) {
        default:
            throw DropboxError('Unsupported UploadError type. File: ' + path + ' Tag: ' + uploadError['.tag']);
    }
}

function HandleGetMetadataError(path: string, getMetadataError: DropboxAPI.GetMetadataError) {
    switch (getMetadataError['.tag']) {
        case 'path': //DownloadErrorPath
            HandleLookupError(path, downloadError.path);
        default:
            throw DropboxError('Unsupported GetMetadataError type. File: ' + path);
    }
}

export class DropboxFS implements FSInterface {
    private dbx: DropboxAPI.Dropbox;
    constructor(dbx: DropboxAPI.Dropbox) {
        this.dbx = dbx;
    }

    //for files below 150MB
    async uploadSmallFile(path: string, file: File): Promise<FileSystemStatus> {
        try {
            await this.dbx.filesUpload({ path, contents: file.content });
            return FileSystemStatus.Success;
        } catch (error) {
            var uploadError = error.error;
            if (!!uploadError.error) {
                return HandleUploadError(path, uploadError.error);
            } else {
                throw DropboxError(uploadError);
            }
        }
    }

    async uploadFile(path: string, file: File): Promise<FileSystemStatus> {
        return this.uploadSmallFile(path, file);
    }

    async downloadFile(path: string): Promise<{ status: FileSystemStatus; file?: File }> {
        try {
            var respond = await this.dbx.filesDownload({ path });
            return { status: FileSystemStatus.Success, file: { content: respond.result.fileBlob } };
        } catch (error) {
            var downloadError = error.error;
            if (!!downloadError.error) {
                return { status: HandleDownloadError(path, downloadError.error) }; // promise returns DropboxResponseError<Error<files.DownloadError>> (there is a mistake in index.d.ts)
            } else {
                throw DropboxError(downloadError);
            }
        }
    }

    async getFileHash(path: string): Promise<string> {
        try {
            var fileMeta = (await this.dbx.filesGetMetadata({ path })).result as DropboxAPI.files.FileMetadata;
        } catch (error) {
            var getMetadataError = error.error;
            if (getMetadataError.error) {
                HandleGetMetadataError(path, getMetadataError.error);
            } else {
                throw DropboxError(getMetadataError);
            }
        }

        if (!!fileMeta.content_hash) {
            return fileMeta.content_hash;
        } else {
            throw DropboxError({
                status: FileSystemStatus.NotFound,
                message: 'getFileHash: no hash for file "' + path + '"',
            });
        }
    }
}
