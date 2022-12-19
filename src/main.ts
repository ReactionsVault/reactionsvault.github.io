import { DROPBOX_APP } from './dropbox/dropbox_common';
import { Dropbox } from './dropbox/dropbox';
import { FileSystemStatus, FileUploadMode } from './interfaces/fs_interface';
import { IndexedDB } from './indexeddb/db_indexed';

var system: Dropbox | null = null;
var db: IndexedDB = new IndexedDB();

const DB_NAME = '/reactionsvault_db';
async function uploadDataBaseCallBack(db_json: stirng): Promise<void> {
    var result = await system.fs.uploadFile(DB_NAME, { content: new Blob([db_json]) }, FileUploadMode.Replace);
    window.localStorage.setItem('db_hash', result.fileInfo.hash);
}

async function uploadDataBase(): Promise<void> {
    await db.export(uploadDataBaseCallBack);
}

async function loadDataBase(): Promise<void> {
    var db_hash: string = window.localStorage.getItem('db_hash');
    if (!!db_hash) {
        var test_db_hash = await system.fs.getFileHash(DB_NAME);
        if (db_hash !== test_db_hash) {
            var download_result = await system.fs.downloadFile(DB_NAME);
            var db_file = download_result.file.content.text();
            db.import(db_file);
        }
    } else {
        var download_result = await system.fs.downloadFile(DB_NAME);
        switch (download_result.status) {
            case FileSystemStatus.Success:
                db.import(await download_result.file.content.text());
                window.localStorage.setItem('db_hash', download_result.fileInfo.hash);
                break;
            case FileSystemStatus.NotFound:
                uploadDataBase();
                break;
        }
    }
}

var fileUploadButton: HTMLElement = document.getElementById('reaction');
{
    async function uploadImage(): Promise<void> {
        const file = fileUploadButton.files[0];
        if (!!file) {
            var result = await system?.fs.uploadFile('/' + file.name, { content: file }, FileUploadMode.Add);
            await db.addMedium(result?.fileInfo?.name);
            uploadDataBase();
        }
    }
    fileUploadButton.addEventListener('change', uploadImage);
}

var imgView: HTMLElement = document.getElementById('testimg');
async function showImg(): Promise<void> {
    var img_file = await system.fs.downloadFile('/test.jpg');
    imgView.src = URL.createObjectURL(img_file.file.content);
}

var signInButtons: HTMLElement[] = [];
//Dropbox login
var dropbox: Dropbox | null = null;
{
    const dropboxSignIn = document.getElementById('dropbox-sign-in');
    if (!!dropboxSignIn) {
        signInButtons.push(dropboxSignIn);
        dropboxSignIn.addEventListener('click', () => {
            dropbox = new Dropbox();
            dropbox.auth.RequestLogin();
        });
    }
}

var tagElement = document.getElementById('tag');
var addTagButton = document.getElementById('add_tag');
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

const system_name = window.localStorage.getItem('auth_app');
var loggedIn: boolean = false;
if (!!system_name) {
    const access_token = window.localStorage.getItem('auth_access_token');
    const refresh_token = window.localStorage.getItem('auth_refresh_token');
    if (!!access_token) {
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
                window.localStorage.setItem('auth_access_token', tokens.access_token);
                window.localStorage.setItem('auth_refresh_token', tokens.refresh_token);
                await system.auth.Login(tokens.access_token, tokens.refresh_token);
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
