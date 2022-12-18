export enum FileSystemStatus {
    Unknown,
    Success,
    NotFound,
}

export class File {
    content: Blob;
}

export class FileInfo {
    hash: string | undefined;
}
export class UploadResult {
    status: FileSystemStatus;
    fileInfo?: FileInfo;
}
export interface FSInterface {
    calculateFileHash(file: File): Promise<string>;
    getFileHash(path: string): Promise<string>; // return file's hash from server as string
    uploadFile(path: string, file: File): Promise<UploadResult>;
    downloadFile(path: string): Promise<{ status: FileSystemStatus; file?: File }>;
}
