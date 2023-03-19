import { launch } from "puppeteer";
import sleep from "sleep-promise";
import { saveCookies } from "./cookies-storage.js";

(async () => {
    const browser = await launch({ headless: false });
    const page = await browser.newPage();

    await page.goto("https://dev.azure.com/bratislava-innovation/");

    let disconnected = false;
    let cookies;
    browser.on("disconnected", () => {
        disconnected = true;
    });

    while (!disconnected) {
        try {
            cookies = await page.cookies();
        } catch (e) {}
        await sleep(50);
    }

    await saveCookies(cookies);
    console.log("Credentials saved in keytar.");

    await browser.close();
})();
