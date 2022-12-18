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
    public async import(db_json: string): Promise<void> {
        var db_obj = JSON.parse(db_json);
        const trn = db.transaction([DB_TAGS, DB_MEDIA], 'readwrite');
        const tagsStore = trn.objectStore(DB_TAGS);
        for (let tag of db_obj.tags) {
            tagsStore.add(tag);
        }

        const mediaStore = trn.objectStore(DB_MEDIA);
        for (let medium of db_obj.media) {
            mediaStore.add(medium);
        }
    }
    public async export(callback: (db_json: string) => Promise<void>): Promise<void> {
        var db_obj = { tags: [], media: [] };

        var trn = db.transaction([DB_TAGS, DB_MEDIA], 'readonly');
        const tagsStore = trn.objectStore(DB_TAGS);
        const requestTags = tagsStore.openCursor();
        requestTags.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                db_obj.tags.push(cursor.value);
                cursor.continue();
            }
        };
        const mediaStore = trn.objectStore(DB_MEDIA);
        const requestMedia = mediaStore.openCursor();
        requestMedia.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                db_obj.media.push(cursor.value);
                cursor.continue();
            }
        };

        trn.oncomplete = (event) => {
            var db_json = JSON.stringify(db_obj);
            callback(db_json);
        };
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
