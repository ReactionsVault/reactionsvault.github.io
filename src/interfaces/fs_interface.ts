export enum FileSystemStatus {
    Unknown,
    Success,
    NotFound,
}

export enum FileUploadMode {
    Add,
    Replace,
}

export class File {
    content: Blob;
}

export class FileInfo {
    hash: string | undefined;
    name: stirng | undefined;
}
export class UploadResult {
    status: FileSystemStatus;
    fileInfo?: FileInfo;
}
export class DownloadResult {
    status: FileSystemStatus;
    file?: File;
    fileInfo?: FileInfo;
}
export interface FSInterface {
    calculateFileHash(file: File): Promise<string>;
    getFileHash(path: string): Promise<string>; // return file's hash from server as string
    uploadFile(path: string, file: File, mode: FileUploadMode): Promise<UploadResult>;
    downloadFile(path: string): Promise<DownloadResult>;
}
