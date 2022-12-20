import { DROPBOX_APP } from './dropbox/dropbox_common';
import { Dropbox } from './dropbox/dropbox';
import { FileInfo, FileSystemStatus, FileUploadMode, UploadResult } from './interfaces/fs_interface';
import { IndexedDB } from './indexeddb/db_indexed';
import { Renderreact } from './tsx/reactdemo';

var system: Dropbox | null = null;
var db: IndexedDB = new IndexedDB();

const DB_NAME = '/reactionsvault_db';
async function uploadDataBaseCallBack(db_json: string): Promise<void> {
    var result = await system?.fs.uploadFile(DB_NAME, { content: new Blob([db_json]) }, FileUploadMode.Replace);
    if (!!!result) throw Error('uploadDataBaseCallBack: no result');
    if (result.status !== FileSystemStatus.Success) throw Error('Couldnt upload db, status: ' + result.status);
    if (!!!result.fileInfo) throw Error('uploadDataBaseCallBack: No fileInfo');
    if (!!!result.fileInfo.hash) throw Error('uploadDataBaseCallBack: No hash');
    window.localStorage.setItem('db_hash', result.fileInfo.hash);
}

async function uploadDataBase(): Promise<void> {
    await db.export(uploadDataBaseCallBack);
}

async function loadDataBase(): Promise<void> {
    if (system === null) {
        throw Error('No system active');
    }

    var db_hash: string | null = window.localStorage.getItem('db_hash');
    if (!!db_hash) {
        var test_db_hash = await system.fs.getFileHash(DB_NAME);
        if (db_hash !== test_db_hash) {
            var download_result = await system.fs.downloadFile(DB_NAME);
            if (download_result.status !== FileSystemStatus.Success) {
                throw Error('Local hash exists. Couldnt download db, status: ' + download_result.status);
            }
            var db_file = await download_result.file?.content?.text();
            if (!!!db_file) throw Error('loadDataBase: Local hash exists. Couldnt read donwloaded db');
            db.import(db_file);
        }
    } else {
        var download_result = await system.fs.downloadFile(DB_NAME);
        switch (download_result.status) {
            case FileSystemStatus.Success:
                var db_file = await download_result.file?.content?.text();
                if (!!!db_file) throw Error('loadDataBase: Local hash doesnt exists. Couldnt read donwloaded db');
                db.import(db_file);

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

var signInButtons: HTMLButtonElement[] = [];

const system_name = window.localStorage.getItem('auth_app');
var loggedIn: boolean = false;

async function main() {
    var fileUploadButton: HTMLInputElement = document.getElementById('reaction') as HTMLInputElement;
    {
        async function uploadImage(): Promise<void> {
            if (!!fileUploadButton.files && fileUploadButton.files.length > 0) {
                const file = fileUploadButton.files[0];
                if (!!file) {
                    var result = (await system?.fs.uploadFile(
                        '/' + file.name,
                        { content: file },
                        FileUploadMode.Add
                    )) as UploadResult;

                    if (result.status !== FileSystemStatus.Success) {
                        throw Error('Couldnt upload medium, status: ' + result.status);
                    }
                    await db.addMedium((result.fileInfo as FileInfo).name as string);
                    uploadDataBase();
                }
            }
        }
        fileUploadButton.addEventListener('change', uploadImage);
    }

    //Dropbox login
    var dropbox: Dropbox | null = null;
    {
        const dropboxSignIn = document.getElementById('dropbox-sign-in');
        if (!!dropboxSignIn) {
            signInButtons.push(dropboxSignIn as HTMLButtonElement);
            dropboxSignIn.addEventListener('click', () => {
                dropbox = new Dropbox();
                dropbox.auth.RequestLogin();
            });
        }
    }

    var tagElement: HTMLInputElement = document.getElementById('tag') as HTMLInputElement;
    var addTagButton = document.getElementById('add_tag') as HTMLButtonElement;
    {
        async function addTag() {
            const tagName = tagElement.value;
            if (!!tagName) {
                tagElement.value = '';
                await db.addTag(tagName);
                uploadDataBase();
            }
        }
        addTagButton.addEventListener('click', addTag);
    }

    if (!!system_name) {
        const access_token = window.localStorage.getItem('auth_access_token');
        const refresh_token = window.localStorage.getItem('auth_refresh_token');
        if (!!access_token && !!refresh_token) {
            switch (system_name) {
                case DROPBOX_APP:
                    if (dropbox == null) dropbox = new Dropbox();
                    system = dropbox;
                    await system.auth.Login(access_token, refresh_token);
                    loggedIn = true;
                    break;
                default:
                    throw Error('Unknown auth_app: ' + system_name);
            }
        } else {
            window.localStorage.removeItem('auth_app');
        }
    }

    if (!loggedIn) {
        const queryString = window.location.search; // Returns:'?q=123'// params.get('q') is the number 123
        const params = new URLSearchParams(queryString);
        const oauth_code = params.get('code');
        if (!!oauth_code) {
            switch (params.get('state')) {
                case DROPBOX_APP:
                    if (dropbox == null) dropbox = new Dropbox();
                    system = dropbox;
                    var tokens = await system.auth.GetOAuthAccessToken(oauth_code);
                    window.localStorage.setItem('auth_app', DROPBOX_APP);
                    window.localStorage.setItem('auth_access_token', tokens.access_token as string);
                    window.localStorage.setItem('auth_refresh_token', tokens.refresh_token as string);
                    await system.auth.Login(tokens.access_token as string, tokens.refresh_token as string);
                    loggedIn = true;
                    break;
                default:
                    throw Error('Uknown login app');
            }
        } else {
            for (let button of signInButtons) {
                button.disabled = false;
            }
        }
    }

    if (loggedIn) {
        loadDataBase();
        fileUploadButton.disabled = false;
        tagElement.disabled = false;
        addTagButton.disabled = false;
    }

    Renderreact();
}

main();
