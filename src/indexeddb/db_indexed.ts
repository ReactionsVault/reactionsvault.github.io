import { IndexedDBJSON } from './idb_json';

const DB_VERSION = 1;
const DB_NAME = 'REACTIONS';
const DB_TAGS = 'TAGS';
const DB_MEDIA = 'MEDIA';

function IndexedDBError(error: any) {
    return { system: 'IndexedDB', error };
}

export class Tag {
    name: string = '';
    linkedMedia: number[] = [];
}

export class Medium {
    name: string = '';
    tags: number[] = [];
}

var db: IDBDatabase | null = null;
export class IndexedDB {
    dbExporter: IndexedDBJSON = new IndexedDBJSON();
    defaultTagID: number = -1;

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
        var trn = db.transaction([DB_MEDIA, DB_TAGS], 'readwrite');
        var mediaStore = trn.objectStore(DB_MEDIA);
        var tagStore = trn.objectStore(DB_TAGS);

        var medium = new Medium();
        medium.name = name;
        medium.tags.push(this.defaultTagID);
        const mediaAddRequest = mediaStore.add(medium);

        const defaultTagID = this.defaultTagID;
        mediaAddRequest.onsuccess = () => {
            const mediumKey = mediaAddRequest.result as number;
            const tagDefaultGet = tagStore.get(defaultTagID);
            tagDefaultGet.onsuccess = () => {
                var defaultTag = tagDefaultGet.result as Tag;
                defaultTag.linkedMedia.push(mediumKey);
                tagStore.put(defaultTag);
            };
        };
    }

    public async addTag(name: string) {
        if (db === null) throw IndexedDBError('AddTag, no db');
        var trn = db.transaction(DB_TAGS, 'readwrite');
        var tagStore = trn.objectStore(DB_TAGS);

        var tag = new Tag();
        tag.name = name;
        tagStore.add(tag);
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
            newDB
                .createObjectStore(DB_TAGS, {
                    keyPath: 'id', //this means that stored object (js object) needs param id that works as key.
                    autoIncrement: true,
                })
                .createIndex('name', 'name', { unique: true }); // indices can be quarried, unique = works like key

            newDB
                .createObjectStore(DB_MEDIA, { keyPath: 'id', autoIncrement: true })
                .createIndex('name', 'name', { unique: true });
        };

        var idexedDBObject = this;
        openRequest.onsuccess = function () {
            //called after onupgradeneeded (if it was needed)
            db = openRequest.result;
            var trn = db.transaction(DB_TAGS, 'readwrite');
            var tagsStore = trn.objectStore(DB_TAGS);
            const tagsCountRequest = tagsStore.count();
            tagsCountRequest.onsuccess = () => {
                const tagsCount = tagsCountRequest.result;
                if (tagsCount === 0) {
                    var defaultTag = {
                        key: 1,
                        name: '',
                    };
                    const tagAddRequest = tagsStore.add(defaultTag);
                    tagAddRequest.onsuccess = (e) => (idexedDBObject.defaultTagID = tagAddRequest.result as number);
                } else {
                    idexedDBObject.defaultTagID = 1;
                }
            };
        };
    }
}
