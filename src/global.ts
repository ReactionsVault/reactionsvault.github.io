import { Dropbox } from './dropbox/dropbox';
import { IndexedDB } from './indexeddb/db_indexed';

declare global {
    var system: Dropbox | null;
    var db: IndexedDB;
}
