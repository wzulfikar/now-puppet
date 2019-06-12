const fs = require('fs');
const chrome = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

const { NOW_REGION, PUPPETEER_EXECUTABLE_PATH } = process.env
const NOW_DEV = NOW_REGION == 'dev1'

const visit = async (targetURL) => {
    let puppeteerArgs = {
        args: chrome.args,
        headless: NOW_DEV ? true : chrome.headless,
        executablePath: NOW_DEV ? PUPPETEER_EXECUTABLE_PATH : await chrome.executablePath,
    }

    // use local puppeteer if now is running in dev mode
    if (NOW_DEV) {

        // remove args so that puppeteer uses default args
        delete puppeteerArgs.args

        if (!puppeteerArgs.executablePath) {
            throw new Error('now is running in dev environment but PUPPETEER_EXECUTABLE_PATH is not supplied')
        } else if (!fs.existsSync(puppeteerArgs.executablePath)) {
            throw new Error(`cannot find puppeteer executable at ${puppeteerArgs.executablePath}`)
        }
    }
    
    const browser = await puppeteer.launch(puppeteerArgs)
    const page = await browser.newPage();

    await page.goto(targetURL, {
        timeout: 30 * 1000, 
        waitUntil: "networkidle0"
    });

    return { browser, page }
}

module.exports = {
    visit,
}