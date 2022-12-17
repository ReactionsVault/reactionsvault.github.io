import { DROPBOX_APP } from './dropbox/dropbox_common';
import { Dropbox } from './dropbox/dropbox';
import { FileSystemStatus } from './interfaces/fs_interface';

var system: Dropbox | null = null;

const DB_NAME = '/reactionsvault_db';
async function loadDataBase(): Promise<void> {
    var db_hash: string = window.localStorage.getItem('db_hash');
    if (!!db_hash) {
        var test_db_hash = await system.fs.getFileHash(DB_NAME);
        if (db_hash !== test_db_hash) {
        } else {
            var db_file = await system.fs.downloadFile(DB_NAME);
            console.log(await db_file.file.content.text());
        }
    } else {
        var db_file = await system.fs.downloadFile(DB_NAME);
        switch (db_file.status) {
            case FileSystemStatus.Success:
                console.log(await db_file.file.content.text());
                break;
            case FileSystemStatus.NotFound:
                await system.fs.uploadFile(DB_NAME, { content: new Blob(['test']) });
                db_hash = await system.fs.getFileHash(DB_NAME);
                window.localStorage.setItem('db_hash', db_hash);
                break;
        }
    }
}

var fileUploadButton: HTMLElement = document.getElementById('reaction');
{
    async function uploadImage(): Promise<void> {
        const file = fileUploadButton.files[0];
        if (!!file) {
            await system?.fs.uploadFile('/' + file.name, { content: file });
            console.log('uploaded');
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
}
