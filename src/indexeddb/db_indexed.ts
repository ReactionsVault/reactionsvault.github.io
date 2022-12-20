import { IndexedDBJSON } from './idb_json';

const DB_VERSION = 1;
const DB_NAME = 'REACTIONS';
const DB_TAGS = 'TAGS';
const DB_MEDIA = 'MEDIA';

function IndexedDBError(error: any) {
    return { system: 'IndexedDB', error };
}

export class Tag {
    id: number | undefined;
    name: string = '';
}

export class Medium {
    name: string = '';
}

var db: IDBDatabase | null = null;
export class IndexedDB {
    dbExporter: IndexedDBJSON = new IndexedDBJSON();

    public async import(dbJson: string): Promise<void> {
        if (db === null) throw IndexedDBError('Import, no db');
        this.dbExporter.import(db, dbJson);
    }
    public async export(callback: (dbJson: string) => Promise<void>): Promise<void> {
        if (db === null) throw IndexedDBError('Export, no db');
        this.dbExporter.export(db, callback);
    }

    public async addMedium(name: string) {
        if (db === null) throw IndexedDBError('AddMedium, no db');
        var trn = db.transaction(DB_MEDIA, 'readwrite');
        var mediaStore = trn.objectStore(DB_MEDIA);
        mediaStore.add({ name: name });
    }

    public async addTag(name: string) {
        if (db === null) throw IndexedDBError('AddTag, no db');
        var trn = db.transaction(DB_TAGS, 'readwrite');
        var tagStore = trn.objectStore(DB_TAGS);
        tagStore.add({ name: name });
    }

    constructor() {
        const openRequest = indexedDB.open(DB_NAME, DB_VERSION);
        openRequest.onerror = function () {
            throw IndexedDBError(openRequest.error);
        };

        openRequest.onupgradeneeded = function () {
            //gets called on create and version bump
            //openRequest.result stores new DB
            //here we create DB definition, values it stores etc
            var newDB = openRequest.result;
            newDB.createObjectStore(DB_TAGS, {
                keyPath: 'id', //this means that stored object (js object) needs param id that works as key.
                autoIncrement: true,
            });

            newDB.createObjectStore(DB_MEDIA, { keyPath: 'name' });
        };

        openRequest.onsuccess = function () {
            //called after onupgradeneeded (if it was needed)
            db = openRequest.result;
        };
    }
}
