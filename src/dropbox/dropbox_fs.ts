import * as DropboxAPI from 'dropbox';
import { dbx, DropboxError } from './dropbox';
import { FSInterface, File, FileSystemStatus } from '../interfaces/fs_interface';

function HandleLookupError(path: string, lookupError: DropboxAPI.LookupError) {
  switch (lookupError['.tag']) {
    case 'not_found': //LookupErrorNotFound
      throw DropboxError({ status: FileSystemStatus.NotFound, message: 'HandleLookupError file not found: ' + path });
    default:
      throw DropboxError('Unsupported LookupError type. File: ' + path);
  }
}

function HandleDownloadError(path: string, downloadError: DropboxAPI.DownloadError) {
  switch (downloadError['.tag']) {
    case 'path': //DownloadErrorPath
      HandleLookupError(path, downloadError.path);
      break;
    default:
      throw DropboxError('Unsupported DownloadError type. File: ' + path);
  }
}

function HandleUploadError(path: string, uploadError: DropboxAPI.UploadError) {
  switch (uploadError['.tag']) {
    default:
      throw DropboxError('Unsupported UploadError type. File: ' + path);
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

export class DropboxFS implements FSInterface {
  //for files below 150MB
  async uploadSmallFile(path: string, file: File): Promise<void> {
    try {
      await dbx.filesUpload({ path, contents: file.content });
    } catch (error) {
      var uploadError = error.error;
      if (uploadError.error) {
        HandleUploadError(path, uploadError.error);
      } else {
        throw DropboxError(uploadError);
      }
    }
  }

  async uploadFile(path: string, file: File): Promise<void> {
    return this.uploadSmallFile(path, file);
  }

  async downloadFile(path: string): Promise<File> {
    try {
      var respond = await dbx.filesDownload({ path });
      return { content: respond.result.fileBlob };
    } catch (error) {
      var downloadError = error.error;
      if (downloadError.error) {
        HandleDownloadError(path, downloadError.error); // promise returns DropboxResponseError<Error<files.DownloadError>> (there is a mistake in index.d.ts)
      } else {
        throw DropboxError(downloadError);
      }
    }
  }

  async getFileHash(path: string): Promise<string> {
    try {
      var fileMeta = (await dbx.filesGetMetadata({ path })).result as DropboxAPI.files.FileMetadata;
    } catch (error) {
      var getMetadataError = error.error;
      if (getMetadataError.error) {
        HandleGetMetadataError(path, getMetadataError.error);
      } else {
        throw DropboxError(getMetadataError);
      }
    }

    if (fileMeta?.content_hash) {
      return fileMeta?.content_hash;
    } else {
      throw DropboxError({
        status: FileSystemStatus.NotFound,
        message: 'getFileHash: no hash for file "' + path + '"',
      });
    }
  }
}
