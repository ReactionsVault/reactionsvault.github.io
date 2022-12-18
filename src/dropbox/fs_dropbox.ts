import * as DropboxAPI from 'dropbox';
import { DropboxError } from './dropbox_common';
import { FSInterface, File, FileSystemStatus, UploadResult, FileInfo } from '../interfaces/fs_interface';
import * as CryptoJS from 'crypto-js';

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
            HandleLookupError(path, getMetadataError.path);
        default:
            throw DropboxError('Unsupported GetMetadataError type. File: ' + path);
    }
}

function preparePath(path: string): string {
    var returnPath = path;
    if (path[0] != '/') returnPath = '/' + returnPath;

    return returnPath;
}

export class DropboxFS implements FSInterface {
    private dbx: DropboxAPI.Dropbox;
    constructor(dbx: DropboxAPI.Dropbox) {
        this.dbx = dbx;
    }

    async calculateFileHash(file: File): Promise<string> {
        /*
            -Split the file into blocks of 4 MB (4,194,304 or 4 * 1024 * 1024 bytes). The last block (if any) may be smaller than 4 MB.
            -Compute the hash of each block using SHA-256.
            -Concatenate the hash of all blocks in the binary format to form a single binary string.
            -Compute the hash of the concatenated string using SHA-256. Output the resulting hash in hexadecimal format.
        */

        throw DropboxError('calculateFileHash not implemented');
    }

    //for files below 150MB
    private async uploadSmallFile(path: string, file: File): Promise<UploadResult> {
        try {
            var fileMeta = (
                await this.dbx.filesUpload({
                    path,
                    contents: file.content,
                    autorename: true,
                    mute: true,
                    mode: 'add',
                })
            ).result;
        } catch (error) {
            var uploadError = error.error;
            if (!!uploadError.error) {
                return { status: HandleUploadError(path, uploadError.error) };
            } else {
                throw DropboxError(uploadError);
            }
        }

        return { status: FileSystemStatus.Success, fileInfo: { hash: fileMeta.content_hash } };
    }

    private async uploadBigFile(path: string, file: File): Promise<UploadResult> {
        const concurrentSize = 4194304; // call must be multiple of 4194304 bytes (except for last upload_session/append:2 with UploadSessionStartArg.close to true, that may contain any remaining data).
        const maxBlob = concurrentSize * Math.floor((8 * 1024 * 1024) / concurrentSize); // 8MB - Dropbox JavaScript API suggested max file / chunk size

        var blobs: Blob[] = [];
        var offset = 0;
        while (offset < file.content.size) {
            var blobSize = Math.min(maxBlob, file.content.size - offset);
            blobs.push(file.content.slice(offset, offset + blobSize));
            offset += maxBlob;
        }
        const blobsCount = blobs.length;

        try {
            var sessionId = (await this.dbx.filesUploadSessionStart({ session_type: 'concurrent' })).result.session_id;
        } catch (error) {
            var uploadError = error.error;
            if (!!uploadError.error) {
                return { status: HandleUploadError(path, uploadError.error) };
            } else {
                throw DropboxError(uploadError);
            }
        }

        try {
            var uploadPromises: Promise<DropboxResponse<void>>[] = [];
            for (let id = 0; id < blobsCount - 1; ++id) {
                var cursor = { session_id: sessionId, offset: id * maxBlob };
                uploadPromises.push(this.dbx.filesUploadSessionAppendV2({ cursor: cursor, contents: blobs[id] }));
            }

            var lastBlob = blobs[blobsCount - 1];
            var cursor = { session_id: sessionId, offset: (blobsCount - 1) * maxBlob };
            uploadPromises.push(
                this.dbx.filesUploadSessionAppendV2({ cursor: cursor, contents: lastBlob, close: true })
            );
            await Promise.all(uploadPromises);
        } catch (error) {
            var uploadError = error.error;
            if (!!uploadError.error) {
                return { status: HandleUploadError(path, uploadError.error) };
            } else {
                throw DropboxError(uploadError);
            }
        }

        try {
            var cursor = { session_id: sessionId, offset: 0 /*concurrent*/ };
            var commit = { path: path, autorename: true, mute: true, mode: 'add' };
            var fileMeta = (await this.dbx.filesUploadSessionFinish({ cursor: cursor, commit: commit })).result;
        } catch (error) {
            var uploadError = error;
            if (!!uploadError.error) {
                return { status: HandleUploadError(path, uploadError.error) };
            } else {
                throw DropboxError(uploadError);
            }
        }

        return { status: FileSystemStatus.Success, fileInfo: { hash: fileMeta.content_hash } };
    }

    async uploadFile(path: string, file: File): Promise<UploadResult> {
        const smallFileMaxSize = 150 * 1024 * 1024; // 150 MB - from dropbox doc
        var realPath = preparePath(path);
        if (file.content.size < smallFileMaxSize) {
            return this.uploadSmallFile(realPath, file);
        } else {
            return this.uploadBigFile(realPath, file);
        }
    }

    async downloadFile(path: string): Promise<{ status: FileSystemStatus; file?: File }> {
        var realPath = preparePath(path);
        try {
            var respond = await this.dbx.filesDownload({ path: realPath });
        } catch (error) {
            var downloadError = error.error;
            if (!!downloadError.error) {
                return { status: HandleDownloadError(realPath, downloadError.error) }; // promise returns DropboxResponseError<Error<files.DownloadError>> (there is a mistake in index.d.ts)
            } else {
                throw DropboxError(downloadError);
            }
        }
        return { status: FileSystemStatus.Success, file: { content: respond.result.fileBlob } };
    }

    async getFileHash(path: string): Promise<string> {
        var realPath = preparePath(path);
        try {
            var fileMeta = (await this.dbx.filesGetMetadata({ path: realPath }))
                .result as DropboxAPI.files.FileMetadata;
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
