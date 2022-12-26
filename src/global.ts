import { Dropbox } from './dropbox/dropbox';
import { IndexedDB } from './indexeddb/db_indexed';
import { TagsContainer } from './tagsContainer';

declare global {
    var system: Dropbox | null;
    var db: IndexedDB;
    var tags: TagsContainer;
}
