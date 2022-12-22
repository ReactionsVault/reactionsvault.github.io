import { FileSystemStatus, FileUploadMode } from './interfaces/fs_interface';
import { IndexedDB } from './indexeddb/db_indexed';

globalThis.db = new IndexedDB();
const DB_NAME = '/reactionsvault_db';

export async function uploadDataBase(): Promise<void> {
    let dbJson = await globalThis.db.export();

    var result = await system?.fs.uploadFile(DB_NAME, { content: new Blob([dbJson]) }, FileUploadMode.Replace);

    if (!!!result) throw Error('uploadDataBaseCallBack: no result');
    if (result.status !== FileSystemStatus.Success) throw Error('Couldnt upload db, status: ' + result.status);
    if (!!!result.fileInfo) throw Error('uploadDataBaseCallBack: No fileInfo');
    if (!!!result.fileInfo.hash) throw Error('uploadDataBaseCallBack: No hash');

    window.localStorage.setItem('db_hash', result.fileInfo.hash);
}

export async function loadDataBase(): Promise<void> {
    if (globalThis.system === null) {
        throw Error('No system active');
    }

    var db_hash: string | null = window.localStorage.getItem('db_hash');
    if (!!db_hash) {
        var test_db_hash = await globalThis.system.fs.getFileHash(DB_NAME);
        if (db_hash !== test_db_hash) {
            var download_result = await globalThis.system.fs.downloadFile(DB_NAME);
            if (download_result.status !== FileSystemStatus.Success) {
                throw Error('Local hash exists. Couldnt download db, status: ' + download_result.status);
            }
            var db_file = await download_result.file?.content?.text();
            if (!!!db_file) throw Error('loadDataBase: Local hash exists. Couldnt read donwloaded db');
            globalThis.db.import(db_file);
        }
    } else {
        var download_result = await globalThis.system.fs.downloadFile(DB_NAME);
        switch (download_result.status) {
            case FileSystemStatus.Success:
                var db_file = await download_result.file?.content?.text();
                if (!!!db_file) throw Error('loadDataBase: Local hash doesnt exists. Couldnt read donwloaded db');
                globalThis.db.import(db_file);

                if (!!!download_result.fileInfo?.hash)
                    throw Error('loadDataBase: Local hash doesnt exists. No hash in downloaded db');
                window.localStorage.setItem('db_hash', download_result.fileInfo.hash);
                break;
            case FileSystemStatus.NotFound:
                uploadDataBase();
                break;
            default:
                throw Error('Local hash doesnt exists. Couldnt download db, status: ' + download_result.status);
        }
    }
}
