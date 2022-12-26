export class ReactTagObject {
    value: number | string = -1;
    label: string = '';
}

export class TagsContainer {
    tags: ReactTagObject[] = [];
    callbackChange: Map<any, (caller: any) => void> = new Map<any, (caller: any) => void>();

    public getTags(): ReactTagObject[] {
        return this.tags;
    }

    public registerCallback(caller: any, callback: (caller: any) => void) {
        this.callbackChange.set(caller, callback);
    }
    public unregisterCallback(caller: any) {
        this.callbackChange.delete(caller);
    }

    public tagsChanged() {
        for (let callback of this.callbackChange) {
            callback[1](callback[0]);
        }
    }

    public addTag(tag: ReactTagObject) {
        this.tags.push(tag);
        this.tagsChanged();
    }

    public removeTag(tag: ReactTagObject) {
        const tagID = this.tags.findIndex((testTag: ReactTagObject) => testTag.value === tag.value);
        this.tags.splice(tagID, 1);
        this.tagsChanged();
    }

    public async loadTags() {
        let tagsDB = await globalThis.db.getAllTags();

        for (let tag of tagsDB) {
            if (tag.name !== '') {
                this.tags.push({ value: tag.id, label: tag.name });
            }
        }
    }
}
