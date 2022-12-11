export enum FileStatus {
  Unknown,
  Success,
  NotFound,
}

export class File {
  status: FileStatus = FileStatus.Unknown;
  content?: Object;
}

export interface FSInterface {
  getFileHash(path: string): Promise<string>; // return file's hash from server as string
  uploadFile(path: string, file: File): Promise<void>;
  downloadFile(path: string): Promise<File>;
}
