import { IndexedDBJSON } from './idb_json';

const DB_VERSION = 1;
const DB_NAME = 'REACTIONS';
const DB_TAGS = 'TAGS';
const DB_MEDIA = 'MEDIA';

function IndexedDBError(error: any) {
    return { system: 'IndexedDB', error };
}

export class Tag {
    id: number;
    name: string;
}

export class Medium {
    name: string;
}

var db: IDBDatabase | null = null;
export class IndexedDB {
    dbExporter: IndexedDBJSON = new IndexedDBJSON();

    public async import(dbJson: string): Promise<void> {
        this.dbExporter.import(db, dbJson);
    }
    public async export(callback: (dbJson: string) => Promise<void>): Promise<void> {
        this.dbExporter.export(db, callback);
    }

    public async addMedium(name: stirng) {
        var trn = db.transaction(DB_MEDIA, 'readwrite');
        var mediaStore = trn.objectStore(DB_MEDIA);
        mediaStore.add({ name: name });
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
            var tagsStore = newDB.createObjectStore(DB_TAGS, {
                keyPath: 'id', //this means that stored object (js object) needs param id that works as key.
                autoIncrement: true,
            });

            var mediaStore = newDB.createObjectStore(DB_MEDIA, { keyPath: 'name' });
        };

        openRequest.onsuccess = function () {
            //called after onupgradeneeded (if it was needed)
            db = openRequest.result;
        };
    }
}
