// @ts-ignore
function IndexedDBJSONError(error: any) {
    return { system: 'IndexedDBJSON', error };
}

export class IndexedDBJSON {
    public async import(db: IDBDatabase, dbJson: string): Promise<void> {
        var dbObj = JSON.parse(dbJson);
        var storeNames: string[] = [];
        for (let store in dbObj) {
            storeNames.push(store);
        }

        const trn = db.transaction(storeNames, 'readwrite');
        for (let storeName of storeNames) {
            const store = trn.objectStore(storeName);
            for (let obj of dbObj[storeName]) {
                store.add(obj);
            }
        }
    }
    public async export(db: IDBDatabase, callback: (dbJson: string) => Promise<void>): Promise<void> {
        var dbObj: any = {};
        const objectStores = Array.from(db.objectStoreNames);
        for (let storeName of objectStores) {
            dbObj[storeName] = [];
        }

        var trn = db.transaction(objectStores, 'readonly');
        for (let storeName of objectStores) {
            const store = trn.objectStore(storeName);
            const requestCursor = store.openCursor();
            requestCursor.onsuccess = (event) => {
                if (event.target === null) return;

                const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
                if (cursor) {
                    dbObj[storeName].push(cursor.value);
                    cursor.continue();
                }
            };
        }

        trn.oncomplete = () => {
            var dbJson = JSON.stringify(dbObj);
            callback(dbJson);
        };
    }
}
