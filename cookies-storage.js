import keytar from "keytar";

const service = "azureRistorCredentials_NPqcUuD3t7";

// https://stackoverflow.com/a/67297502/2711737
function stringToChunks(string, chunkSize) {
    const chunks = [];
    while (string.length > 0) {
        chunks.push(string.substring(0, chunkSize));
        string = string.substring(chunkSize, string.length);
    }
    return chunks;
}

const wipeStorage = async () => {
    const allCredentials = await keytar.findCredentials(service);
    for (const { account } of allCredentials) {
        await keytar.deletePassword(service, account);
    }
};

export const saveCookies = async (cookies) => {
    await wipeStorage();

    const stringified = JSON.stringify(cookies);

    // String must be chunked as there is a characters count limit.
    // https://github.com/atom/node-keytar/issues/140#issuecomment-456385870
    const chunks = stringToChunks(stringified, 1024);
    await keytar.setPassword(service, "length", String(chunks.length));
    for (const [index, chunk] of chunks.entries()) {
        await keytar.setPassword(service, `chunk-${index}`, chunk);
    }
};

export const getCookies = async () => {
    const lengthString = await keytar.getPassword(service, "length");
    if (lengthString == null) {
        return null;
    }
    const length = Number(lengthString);
    const chunks = [];
    for (let index = 0; index < length; index++) {
        chunks.push(await keytar.getPassword(service, `chunk-${index}`));
    }

    return JSON.parse(chunks.join(""));
};
