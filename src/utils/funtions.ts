
export const cleanMessage = (message: string) => {
    // replace <div> and </div> and <br> with new lines
    return message.replace(/<div>/g, "\n").replace(/<\/div>/g, "").replace(/<br>/g, "\n");
}

export const extractTagsFromSearchTerm = (searchTerm: string) => {
    // extract tags from search term
    return searchTerm.match(/tag:([^ ]*)/g)?.map((tag) => tag.replace("tag:", ""));
}

export const extractSearchTermFromSearchString = (searchString: string) => {
    // extract search term from search string
    return searchString.replace(/tag:([^ ]*)/, '').trim();
}