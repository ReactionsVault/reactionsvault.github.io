export enum FileSystemStatus {
    Unknown,
    Success,
    NotFound,
    MismatchHash,
}

export enum FileUploadMode {
    Add,
    Replace,
}

export class File {
    content: Blob | null = null;
}

export class FileInfo {
    hash: string | undefined;
    name: string | undefined;
}
export class UploadResult {
    status: FileSystemStatus = FileSystemStatus.Unknown;
    fileInfo?: FileInfo;
}
export class DownloadResult {
    status: FileSystemStatus = FileSystemStatus.Unknown;
    file?: File;
    fileInfo?: FileInfo;
}
export interface FileSystem {
    calculateFileHash(file: File): Promise<string>;
    getFileHash(path: string): Promise<string>; // return file's hash from server as string
    uploadFile(path: string, file: File, mode: FileUploadMode): Promise<UploadResult>;
    downloadFile(path: string): Promise<DownloadResult>;
}
