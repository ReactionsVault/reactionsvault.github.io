import { TagObject } from './tsx/tags';

export class TagsContainer {
    tags: TagObject[] = [];

    public getTags(): TagObject[] {
        return this.tags;
    }

    public addTag(tag: TagObject) {
        this.tags.push(tag);
    }

    public removeTagByID(tagID: number) {
        const tagArrayID = this.tags.findIndex((testTag: TagObject) => testTag.value === tagID);
        this.tags.splice(tagArrayID, 1);
    }

    public removeTag(tag: TagObject) {
        this.removeTagByID(tag.value as number);
    }

    public removeTagsByID(tagsID: number[]) {
        if (tagsID.length > 0) {
            for (const id of tagsID) {
                this.removeTagByID(id);
            }
        }
    }

    public async loadTags() {
        let tagsDB = await globalThis.db.getAllTags();

        for (let tag of tagsDB) {
            if (tag.name !== '') {
                this.tags.push({ value: tag.id, name: tag.name });
            }
        }
    }
}
