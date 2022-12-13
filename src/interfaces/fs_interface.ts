export enum FileSystemStatus {
    Unknown,
    Success,
    NotFound,
}

export class File {
    content: Blob;
}

export interface FSInterface {
    getFileHash(path: string): Promise<string>; // return file's hash from server as string
    uploadFile(path: string, file: File): Promise<FileSystemStatus>;
    downloadFile(path: string): Promise<{ status: FileSystemStatus; file?: File }>;
}
