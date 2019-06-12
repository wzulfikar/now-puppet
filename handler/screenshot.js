const { parse } = require('url');
const { parseTarget, endWithCache, endWithError, getInt } = require('../util');
const chromium = require('../chromium');

const getScreenshot = async (targetURL, type, quality, fullPage) => {
    const { browser, page, err } = await chromium.visit(targetURL)
    if (err) {
        return { err }
    }

    if (fullPage === undefined) {
        fullPage = true
    }

    const file = await page.screenshot({ type,  quality, fullPage });
    await browser.close();
    return { file };
}

module.exports = async function (req, res) {
    let { target, puppetQuery = {}, err: targetErr} = parseTarget(req)
    if (targetErr) {
        return endWithError(res, targetErr)
    }

    try {
        let { type = 'png', quality, fullPage } = puppetQuery;

        quality = getInt(quality)
        if (quality) {
            type = 'jpeg'
        }

        const { file, err: handlerErr } = await getScreenshot(target, type, quality, fullPage);
        if (handlerErr) {
            return endWithError(res, handlerErr)
        }

        console.log("[INFO] screenshot completed:", target);

        return endWithCache(res, 200, `image/${type}`, file)
    } catch (e) {
        console.log("[ERROR] handler/screenshot.js (${target}):", e);
        return endWithError(res, {
            message: `screenshot failed for target '${target}'.`,
        })
    }
};
