export const DROPBOX_APP = 'dropbox';
export function DropboxError(error: any) {
    return { system: 'Dropbox', error };
}
