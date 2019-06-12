const { parse } = require('url');
const { parseTarget, endWithCache, endWithError, getInt } = require('../util');
const chromium = require('../chromium');

const getScreenshot = async (targetURL, type, quality, fullPage) => {
    const { browser, page } = await chromium.visit(targetURL)
    
    if (fullPage === undefined) {
        fullPage = true
    }

    const file = await page.screenshot({ type,  quality, fullPage });
    await browser.close();
    return file;
}

module.exports = async function (req, res) {
    let { target, puppetQuery = {}, err} = parseTarget(req)
    if (err) {
        return endWithError(res, err)
    }

    try {
        const { type = 'jpeg', quality, fullPage } = puppetQuery;

        const file = await getScreenshot(target, type, getInt(quality), fullPage);
        console.log("[INFO] screenshot completed:", target);

        return endWithCache(res, 200, `image/${type}`, file)
    } catch (e) {
        console.log("[ERROR] handler/screenshot.js (${target}):", e);
        return endWithError(res, {
            message: `screenshot failed for target '${target}'.`,
        })
    }
};
