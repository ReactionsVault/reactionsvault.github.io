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

    public import(dbJson: string): Promise<void> {
        if (db === null) throw IndexedDBError('Import, no db');
        return this.dbExporter.import(db, dbJson);
    }
    public export(): Promise<string> {
        if (db === null) throw IndexedDBError('Export, no db');
        return this.dbExporter.export(db);
    }

    public addMedium(name: string): Promise<void> {
        if (db === null) throw IndexedDBError('AddMedium, no db');

        return new Promise<void>((resolve) => {
            var trn = (db as IDBDatabase).transaction([DB_MEDIA, DB_TAGS], 'readwrite');
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

            trn.oncomplete = () => resolve();
        });
    }

    public addTag(name: string): Promise<void> {
        if (db === null) throw IndexedDBError('AddTag, no db');
        return new Promise<void>((resolve) => {
            var trn = (db as IDBDatabase).transaction(DB_TAGS, 'readwrite');
            var tagStore = trn.objectStore(DB_TAGS);

            var tag = new Tag();
            tag.name = name;
            tagStore.add(tag);
            trn.oncomplete = () => resolve();
        });
    }

    public getMediaID(tags: number[]): Promise<number[]> {
        if (db === null) throw IndexedDBError('getMediaID, no db');
        return new Promise<number[]>((resolve) => {
            let mediaSet = new Set<number>();

            var trn = (db as IDBDatabase).transaction(DB_TAGS, 'readonly');
            var tagStore = trn.objectStore(DB_TAGS);

            for (let tagKey of tags) {
                const tagGet = tagStore.get(tagKey);
                tagGet.onsuccess = () => {
                    const tag = tagGet.result as Tag;
                    for (let mediumID of tag.linkedMedia) {
                        mediaSet.add(mediumID);
                    }
                };
            }

            trn.oncomplete = () => {
                resolve(Array.from(mediaSet));
            };
        });
    }

    public getMedium(key: number): Promise<Medium | null> {
        if (db === null) throw IndexedDBError('getMedium, no db');
        return new Promise<Medium | null>((resolve) => {
            var trn = (db as IDBDatabase).transaction(DB_MEDIA, 'readonly');
            var mediaStore = trn.objectStore(DB_MEDIA);
            const mediumGet = mediaStore.get(key);

            var medium: Medium | null = null;
            mediumGet.onsuccess = () => {
                medium = mediumGet.result as Medium;
            };

            trn.oncomplete = () => resolve(medium);
        });
    }

    public getAllTags(): Promise<string[]> {
        if (db === null) throw IndexedDBError('getAllTags, no db');
        return new Promise<string[]>((resolve) => {
            var trn = (db as IDBDatabase).transaction(DB_TAGS, 'readonly');
            var tagsStore = trn.objectStore(DB_TAGS);
            let tagsGetAll = tagsStore.getAll();

            var tags: string[] = [];
            tagsGetAll.onsuccess = () => {
                const tagsObjects = tagsGetAll.result as Tag[];
                for (const tag of tagsObjects) {
                    tags.push(tag.name);
                }
            };

            trn.oncomplete = () => resolve(tags);
        });
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
