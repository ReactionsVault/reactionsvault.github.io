//https://javascript.plainenglish.io/create-a-custom-tags-input-using-react-76519c35a842
//https://www.digitalocean.com/community/tutorials/react-react-autocomplete

import '../css/tags.css';
import * as React from 'react';

export class TagObject {
    name: string;
    value: any;

    constructor(name: string, value: any) {
        this.name = name;
        this.value = value;
    }
}

class Props {
    availableTags: TagObject[] = [];
    initTags?: TagObject[];

    selectTagCallback?: (tag: TagObject) => void;
    deselectTagCallback?: (tag: TagObject) => void;
    createTagCallback?: (tagName: string) => TagObject;
}

class State {
    usedTagsVersion: number = 0;
    suggestionTagsVersion: number = 0;
    showSuggestions: boolean = false;
}

export class Tags extends React.Component<Props, State> {
    tagInputElement: React.RefObject<HTMLInputElement>;
    suggestionsElementRef: React.RefObject<HTMLSelectElement>;

    selectedTags: TagObject[] = [];
    suggestionTags: TagObject[] = [];

    selectTag(tag: TagObject) {
        const selectedTagID = this.selectedTags.findIndex((testTag: TagObject) => {
            return testTag.name === tag?.name;
        });

        if (selectedTagID === -1) {
            this.selectedTags.push(tag);
            if (!!this.props.selectTagCallback) this.props.selectTagCallback(tag);

            this.setState((state: State) => {
                return { usedTagsVersion: state.usedTagsVersion + 1 };
            });
        }
    }

    deselectTag(tag: TagObject) {
        const tagID = this.selectedTags.indexOf(tag);
        this.selectedTags.splice(tagID, 1);

        if (!!this.props.deselectTagCallback) this.props.deselectTagCallback(tag);

        this.setState((state: State) => {
            return { usedTagsVersion: state.usedTagsVersion + 1 };
        });
    }

    onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        let inputElement = event.currentTarget;
        const currentSuggestionIndex = !!this.suggestionsElementRef.current
            ? this.suggestionsElementRef.current.selectedIndex
            : -1;

        switch (event.key) {
            case 'Enter':
            case ' ':
                event.preventDefault();
                if (inputElement.value !== '') {
                    const suggestionSelecting = currentSuggestionIndex !== -1;
                    var tagToAdd: TagObject | null = null;
                    if (!suggestionSelecting) {
                        const tagName = inputElement.value;
                        const tagID = this.props.availableTags.findIndex((tag: TagObject) => {
                            return tag.name === tagName;
                        });

                        if (tagID !== -1) {
                            tagToAdd = this.props.availableTags[tagID];
                        } else {
                            if (!!this.props.createTagCallback) tagToAdd = this.props.createTagCallback(tagName);
                        }
                    } else {
                        tagToAdd = this.suggestionTags[currentSuggestionIndex];
                    }

                    if (!!tagToAdd) {
                        this.selectTag(tagToAdd);
                    }

                    inputElement.value = '';
                    this.setState(() => {
                        return { showSuggestions: false };
                    });
                }
                break;
            case 'Backspace':
                if (this.selectedTags.length && !!!inputElement.value) {
                    event.preventDefault();
                    const tag = this.selectedTags[this.selectedTags.length - 1];
                    this.deselectTag(tag);
                }
                break;
            case 'ArrowDown':
                event.preventDefault();
                if (currentSuggestionIndex !== this.suggestionTags.length - 1) {
                    if (!!this.suggestionsElementRef.current) this.suggestionsElementRef.current.selectedIndex += 1;
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (currentSuggestionIndex !== -1 && currentSuggestionIndex !== 0) {
                    if (!!this.suggestionsElementRef.current) this.suggestionsElementRef.current.selectedIndex -= 1;
                }
                break;
        }
    }

    onTagClick(event: React.MouseEvent<HTMLSpanElement>) {
        const tagName = event.currentTarget.innerHTML;
        const tag = this.selectedTags.find((searchTag) => {
            return searchTag.name === tagName;
        });
        if (!!tag) this.deselectTag(tag);
    }

    onSuggestionClick() {
        if (!!this.suggestionsElementRef.current) {
            const currentSuggestionIndex = this.suggestionsElementRef.current.selectedIndex;
            const tag = this.suggestionTags[currentSuggestionIndex];
            this.selectTag(tag);

            if (!!this.tagInputElement.current) this.tagInputElement.current.value = '';

            this.setState(() => {
                return { showSuggestions: false };
            });
        }
    }

    onChanage(event: React.ChangeEvent<HTMLInputElement>) {
        const inputValue = event.currentTarget.value;
        if (inputValue !== '') {
            const filteredSuggestions = this.props.availableTags.filter((tag) => {
                return tag.name.toLowerCase().indexOf(inputValue.toLowerCase()) > -1;
            });
            filteredSuggestions.sort((a, b) => {
                const al = a.name.toLowerCase();
                const bl = b.name.toLowerCase();
                if (al < bl) {
                    return -1;
                }
                if (al > bl) {
                    return 1;
                }
                return 0;
            });

            this.suggestionTags = filteredSuggestions;

            this.setState((state: State) => {
                return { suggestionTagsVersion: state.suggestionTagsVersion + 1, showSuggestions: true };
            });
        } else {
            this.setState(() => {
                return { showSuggestions: false };
            });
        }
    }

    constructor(props: Props) {
        super(props);
        this.state = new State();
        if (!!props.initTags) this.selectedTags = props.initTags;

        this.suggestionsElementRef = React.createRef();
        this.tagInputElement = React.createRef();

        this.onKeyDown = this.onKeyDown.bind(this);
        this.onChanage = this.onChanage.bind(this);
        this.onTagClick = this.onTagClick.bind(this);
        this.onSuggestionClick = this.onSuggestionClick.bind(this);
    }

    render() {
        let suggestionsElements;

        if (this.state.showSuggestions) {
            if (this.suggestionTags.length) {
                suggestionsElements = (
                    <select
                        ref={this.suggestionsElementRef}
                        className="suggestions"
                        size={5}
                        onDoubleClick={this.onSuggestionClick}>
                        {this.suggestionTags.map((tag, index) => {
                            return (
                                <option key={index} value={tag.name}>
                                    {tag.name}
                                </option>
                            );
                        })}
                    </select>
                );
            }
        }

        return (
            <div>
                <div className="tags">
                    {this.selectedTags.map((tag, index) => (
                        <div className="single-tag" key={index}>
                            <span onClick={this.onTagClick}>{tag.name}</span>
                        </div>
                    ))}
                    <input
                        ref={this.tagInputElement}
                        type="text"
                        onKeyDown={this.onKeyDown}
                        onChange={this.onChanage}
                        placeholder="Tag"
                    />
                </div>
                {suggestionsElements}
            </div>
        );
    }
}
