
export const cleanMessage = (message: string) => {
    // replace <div> and </div> and <br> with new lines
    return message.replace(/<div>/g, "\n").replace(/<\/div>/g, "").replace(/<br>/g, "\n")
}

export const extractTagsFromSearchTerm = (searchTerm: string | undefined) => {
    // extract tags from search term they are comma separated e.g tag:tag1,tag2
    return searchTerm?.match(/tag:([^ ]*)/)?.[1]?.split(',') || null;
}

export const extractDuringDate = (searchTerm: string | undefined) => {
    // extract date from search term they are comma separated e.g during:2021-01-01
    return searchTerm?.match(/during:([^ ]*)/)?.[1] || null;
}

export const extractAfterDate = (searchTerm: string | undefined) => {
    // extract date from search term they are comma separated e.g after:2021-01-01
    return searchTerm?.match(/after:([^ ]*)/)?.[1] || null;
}

export const extractBeforeDate = (searchTerm: string | undefined) => {
    // extract date from search term they are comma separated e.g before:2021-01-01
    return searchTerm?.match(/before:([^ ]*)/)?.[1] || null;
}

export const extractSearchTermFromSearchString = (searchString: string | undefined) => {
    // extract search term from search string
    return searchString?.replace(/tag:([^ ]*)/g, "").replace(/during:([^ ]*)/g, "").replace(/after:([^ ]*)/g, "").replace(/before:([^ ]*)/g, "") || null;
}

