import * as DropboxAPI from 'dropbox';
import { dbx } from './dropbox';
import { FSInterface, File, FileStatus } from '../interfaces/fs_interface';

function HandleLookupError(path: string, lookupError: DropboxAPI.LookupError): File {
  switch (lookupError['.tag']) {
    case 'not_found': //LookupErrorNotFound
      console.info('[Dropbox] HandleLookupError file not found: ' + path);
      return { status: FileStatus.NotFound };
      break;
    default:
      throw TypeError('[Dropbox] Unsupported LookupError type. File: ' + path);
  }
}

function HandleDownloadError(path: string, downloadError: DropboxAPI.DownloadError): File {
  switch (downloadError['.tag']) {
    case 'path': //DownloadErrorPath
      return HandleLookupError(path, downloadError.path);
      break;
    default:
      throw TypeError('[Dropbox] Unsupported DownloadError type. File: ' + path);
  }
}

function HandleUploadError(path: string, uploadError: DropboxAPI.UploadError) {
  switch (uploadError['.tag']) {
    default:
      throw TypeError('[Dropbox] Unsupported UploadError type. File: ' + path);
  }
}

function HandleGetMetadataError(path: string, getMetadataError: DropboxAPI.GetMetadataError): string {
  switch (getMetadataError['.tag']) {
    case 'path': //DownloadErrorPath
      HandleLookupError(path, getMetadataError.path);
      return '';

      break;
    default:
      throw TypeError('[Dropbox] Unsupported GetMetadataError type. File: ' + path);
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
        throw TypeError(uploadError);
      }
    }
  }

  async uploadFile(path: string, file: File): Promise<void> {
    return this.uploadSmallFile(path, file);
  }

  async downloadFile(path: string): Promise<File> {
    try {
      var respond = await dbx.filesDownload({ path });
      return { status: FileStatus.Success, content: respond };
    } catch (error) {
      var downloadError = error.error;
      if (downloadError.error) {
        return HandleDownloadError(path, downloadError.error); // promise returns DropboxResponseError<Error<files.DownloadError>> (there is a mistake in index.d.ts)
      } else {
        throw TypeError(downloadError);
      }
    }
  }

  async getFileHash(path: string): Promise<string> {
    try {
      var fileMeta = (await dbx.filesGetMetadata({ path })).result as DropboxAPI.files.FileMetadata;
    } catch (error) {
      var getMetadataError = error.error;
      if (getMetadataError.error) {
        return HandleGetMetadataError(path, getMetadataError.error);
      } else {
        throw TypeError(getMetadataError);
      }
    }

    if (fileMeta?.content_hash) {
      return fileMeta?.content_hash;
    } else {
      throw TypeError('[Dropbox] getFileHash: no hash for file "' + path + '"');
    }
  }
}
