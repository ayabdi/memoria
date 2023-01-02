
export const cleanMessage = (message: string) => {
    // replace <div> and </div> and <br> with new lines
    return message.replace(/<div>/g, "\n").replace(/<\/div>/g, "").replace(/<br>/g, "\n");
}