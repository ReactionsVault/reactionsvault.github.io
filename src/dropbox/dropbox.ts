import * as DropboxAPI from 'dropbox';
import { DropboxAuth } from './auth_dropbox';
import { DropboxFS } from './fs_dropbox';

export class Dropbox {
    private dbx: DropboxAPI.Dropbox = new DropboxAPI.Dropbox();
    auth: DropboxAuth;
    fs: DropboxFS;

    constructor() {
        this.auth = new DropboxAuth();
        this.dbx = new DropboxAPI.Dropbox({ auth: this.auth.GetDropboxAuth() });
        this.auth.SetDropbox(this.dbx);
        this.fs = new DropboxFS(this.dbx);
    }
}
