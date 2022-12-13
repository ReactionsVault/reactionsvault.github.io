import { DROPBOX_APP, DROPBOX_STATE, dropbox_login_code, dropbox_login } from './dropbox/dropbox';
import { DropboxFS } from './dropbox/dropbox_fs';
import { FileSystemStatus } from './interfaces/fs_interface';

var fs: DropboxFS | null = null;

const DB_NAME = '/reactionsvault_db';
async function loadDataBase(): Promise<void> {
    var db_hash: string = window.localStorage.getItem('db_hash');
    if (!!db_hash) {
        var test_db_hash = await fs?.getFileHash(DB_NAME);
        if (db_hash !== test_db_hash) {
        } else {
            var db_file = await fs?.downloadFile(DB_NAME);
            console.log(await db_file.file.content.text());
        }
    } else {
        var db_file = await fs?.downloadFile(DB_NAME);
        switch (db_file.status) {
            case FileSystemStatus.Success:
                console.log(await db_file.file.content.text());
                break;
            case FileSystemStatus.NotFound:
                await fs?.uploadFile(DB_NAME, { content: 'test' });
                db_hash = await fs?.getFileHash(DB_NAME);
                window.localStorage.setItem('db_hash', db_hash);
                break;
        }
    }
}

async function logIn_Callback(app: string | null, access_token: string | null) {
    if (!!app && !!access_token) {
        switch (app) {
            case DROPBOX_APP:
                fs = new DropboxFS();
                break;
        }

        const dropboxSignIn = document.getElementById('dropbox-sign-in');
        dropboxSignIn.disabled = true;

        loadDataBase();
    }
}

function logInCode_Callback(app: string | null, access_token: string | null) {
    if (!!app && !!access_token) {
        window.localStorage.setItem('auth_app', app);
        window.localStorage.setItem('auth_token', access_token);
        logIn_Callback(app, access_token);
    }
}

var auth_app: string | null;
var auth_token: string | null;
function hasAuthData() {
    auth_app = window.localStorage.getItem('auth_app');
    auth_token = window.localStorage.getItem('auth_token');
    return !!auth_app && !!auth_token;
}

if (hasAuthData()) {
    switch (auth_app) {
        case DROPBOX_APP:
            dropbox_login(auth_token, logIn_Callback);
            break;
    }
} else {
    const queryString = window.location.search; // Returns:'?q=123'// params.get('q') is the number 123
    const params = new URLSearchParams(queryString);

    if (params.get('state') === DROPBOX_STATE) {
        var code = params.get('code');
        if (!!code) dropbox_login_code(code, logInCode_Callback);
    }
}
