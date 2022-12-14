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

export class TagWithID extends Tag {
    id: number = -1;
}

export class Medium {
    name: string = '';
    tags: number[] = [];
}

export class MediumWithID extends Medium {
    id: number = -1;
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

    /*returns true if tag was deleted*/
    public removeMedium(key: number): Promise<number[]> {
        if (db === null) throw IndexedDBError('removeMedium, no db');

        return new Promise<number[]>((resolve) => {
            var trn = (db as IDBDatabase).transaction([DB_MEDIA, DB_TAGS], 'readwrite');
            var mediaStore = trn.objectStore(DB_MEDIA);
            var tagStore = trn.objectStore(DB_TAGS);
            let tagsDeleted: number[] = [];

            const mediumGetRequest = mediaStore.get(key);
            mediumGetRequest.onsuccess = () => {
                const medium = mediumGetRequest.result as MediumWithID;
                for (const tagID of medium.tags) {
                    const tagGetRequest = tagStore.get(tagID);
                    tagGetRequest.onsuccess = () => {
                        let tag = tagGetRequest.result as TagWithID;

                        if (tag.linkedMedia.length === 1) {
                            tagsDeleted.push(tagID);
                            tagStore.delete(tagID);
                        } else {
                            const mediumID = tag.linkedMedia.indexOf(key);
                            tag.linkedMedia.splice(mediumID, 1);
                            tagStore.put(tag);
                        }
                    };
                }
            };
            mediaStore.delete(key);

            trn.oncomplete = () => resolve(tagsDeleted);
        });
    }

    public addTag(name: string): Promise<number> {
        if (db === null) throw IndexedDBError('AddTag, no db');
        return new Promise<number>((resolve) => {
            var trn = (db as IDBDatabase).transaction(DB_TAGS, 'readwrite');
            var tagStore = trn.objectStore(DB_TAGS);

            var tag = new Tag();
            tag.name = name;
            let tagAdd = tagStore.add(tag);
            trn.oncomplete = () => resolve(tagAdd.result as number);
        });
    }

    public linkTagToMedium(tagID: number, mediumID: number): Promise<void> {
        if (db === null) throw IndexedDBError('linkTagToMedium, no db');
        return new Promise<void>((resolve) => {
            var trn = (db as IDBDatabase).transaction([DB_MEDIA, DB_TAGS], 'readwrite');
            var mediaStore = trn.objectStore(DB_MEDIA);
            var tagStore = trn.objectStore(DB_TAGS);

            const mediumGetRequest = mediaStore.get(mediumID);
            mediumGetRequest.onsuccess = () => {
                const tagGetRequest = tagStore.get(tagID);
                tagGetRequest.onsuccess = () => {
                    let medium: MediumWithID = mediumGetRequest.result as MediumWithID;
                    let tag: TagWithID = tagGetRequest.result as TagWithID;
                    medium.tags.push(tagID);
                    tag.linkedMedia.push(mediumID);

                    mediaStore.put(medium);
                    tagStore.put(tag);
                };
            };
            trn.oncomplete = () => resolve();
        });
    }

    /*returns true if tag was deleted*/
    public unlinkTagToMedium(tagID: number, mediumID: number): Promise<boolean> {
        if (db === null) throw IndexedDBError('unlinkTagToMedium, no db');
        return new Promise<boolean>((resolve) => {
            var trn = (db as IDBDatabase).transaction([DB_MEDIA, DB_TAGS], 'readwrite');
            var mediaStore = trn.objectStore(DB_MEDIA);
            var tagStore = trn.objectStore(DB_TAGS);
            let tagDeleted = false;

            const mediumGetRequest = mediaStore.get(mediumID);
            mediumGetRequest.onsuccess = () => {
                const tagGetRequest = tagStore.get(tagID);
                tagGetRequest.onsuccess = () => {
                    let medium: MediumWithID = mediumGetRequest.result as MediumWithID;
                    let tag: TagWithID = tagGetRequest.result as TagWithID;

                    const tagIDinMedium = medium.tags.indexOf(tagID);

                    medium.tags.splice(tagIDinMedium, 1);
                    if (tag.linkedMedia.length === 1) {
                        tagDeleted = true;
                        tagStore.delete(tagID);
                    } else {
                        const mediumIDinTag = tag.linkedMedia.indexOf(mediumID);
                        tag.linkedMedia.splice(mediumIDinTag, 1);
                        tagStore.put(tag);
                    }

                    mediaStore.put(medium);
                };
            };
            trn.oncomplete = () => resolve(tagDeleted);
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

    public getMedium(key: number): Promise<MediumWithID | null> {
        if (db === null) throw IndexedDBError('getMedium, no db');
        return new Promise<MediumWithID | null>((resolve) => {
            var trn = (db as IDBDatabase).transaction(DB_MEDIA, 'readonly');
            var mediaStore = trn.objectStore(DB_MEDIA);
            const mediumGet = mediaStore.get(key);

            var medium: MediumWithID | null = null;
            mediumGet.onsuccess = () => {
                medium = mediumGet.result as MediumWithID;
            };

            trn.oncomplete = () => resolve(medium);
        });
    }

    public getMediumTags(key: number): Promise<TagWithID[]> {
        if (db === null) throw IndexedDBError('getMediumTags, no db');
        return new Promise<TagWithID[]>((resolve) => {
            let tags: TagWithID[] = [];
            var trn = (db as IDBDatabase).transaction([DB_MEDIA, DB_TAGS], 'readonly');
            var mediaStore = trn.objectStore(DB_MEDIA);
            var tagsStore = trn.objectStore(DB_TAGS);

            const mediumGetRequest = mediaStore.get(key);
            mediumGetRequest.onsuccess = () => {
                const medium = mediumGetRequest.result as MediumWithID;
                for (const tagID of medium.tags) {
                    const tagGetRequest = tagsStore.get(tagID);
                    tagGetRequest.onsuccess = () => {
                        tags.push(tagGetRequest.result as TagWithID);
                    };
                }
            };

            trn.oncomplete = () => resolve(tags);
        });
    }

    public getAllTags(): Promise<TagWithID[]> {
        if (db === null) throw IndexedDBError('getAllTags, no db');
        return new Promise<TagWithID[]>((resolve) => {
            var trn = (db as IDBDatabase).transaction(DB_TAGS, 'readonly');
            var tagsStore = trn.objectStore(DB_TAGS);
            let tagsGetAll = tagsStore.getAll();

            var tags: TagWithID[] = [];
            tagsGetAll.onsuccess = () => {
                const tagsObjects = tagsGetAll.result as TagWithID[];
                tags = tagsObjects;
            };

            trn.oncomplete = () => resolve(tags);
        });
    }

    deleteDB(): Promise<void> {
        if (db === null) throw IndexedDBError('getAllTags, no db');
        return new Promise<void>((resolve) => {
            const objectStores = Array.from((db as IDBDatabase).objectStoreNames);
            const trn = (db as IDBDatabase).transaction(objectStores, 'readwrite');
            for (let storeName of objectStores) {
                var objectStore = trn.objectStore(storeName);
                objectStore.clear();
            }

            trn.oncomplete = () => resolve();
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
                    var defaultTag = new TagWithID();
                    defaultTag.id = 1;
                    const tagAddRequest = tagsStore.add(defaultTag);
                    tagAddRequest.onsuccess = () => (idexedDBObject.defaultTagID = tagAddRequest.result as number);
                } else {
                    idexedDBObject.defaultTagID = 1;
                }
            };
        };
    }
}
