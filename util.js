const { parse, URL } = require('url')
const qs = require('querystring')

function getInt(str) {
    return /[0-9]+/.test(str) ? parseInt(str) : undefined;
}

// remove internal params from target url
const _stripQuery = (targetURL, prefix = '_ssr_') => {
    let { protocol, host, query } = parse(targetURL, true)

    // extract ssr query from target url
    let ssrQuery = {}
    Object.keys(query).forEach(k => {
        if (k.startsWith(prefix)) {
            ssrQuery[query[k].replace(prefix, '')] = query[k]
            delete query[k]
        }
    })
    
    const newQuery = qs.stringify(query)
    if (newQuery.length) {
        return `${protocol}//${host}?${newQuery}`
    }

    return {
        ssrQuery,
        sanitizedTarget: `${protocol}//${host}`,
    }
}

const parseTarget = (req) => {
    // remove path prefix to extract target url
    let [handler, ...targetURL] = req.url.split('/').splice(1)

    let target = targetURL.join('/')

    // reject target if recursive
    if (target.includes(req.headers['host'])) {
        return {
            err: {
                code: 400,
                type: '400 bad request',
                message: 'recursive url is not allowed',
            }
        }
    }

    // add http prefix if base url is specified without it.
    let BASE_URL = process.env.BASE_URL
    if (BASE_URL && !BASE_URL.startsWith('http')) {
        BASE_URL = `http://${BASE_URL}`

        // validate base url
        if (!parse(BASE_URL).hostname) {
            return {
                err: {
                    message: `could not construct valid BASE_URL: ${BASE_URL}`,
                }
            }
        }
    }

    // treat target url as absolute if BASE_URL is not specified.
    hasHttpPrefix = target.startsWith('http')
    if (!BASE_URL && !hasHttpPrefix) {
        target = `http://${target}`
    } else if (BASE_URL && !hasHttpPrefix) {
        target = `${BASE_URL}/${target}`
    } else if (BASE_URL && target.startsWith('http')) {
        return {
            err: {
                message: `target URL must not start with http because BASE_URL is set. BASE_URL: ${BASE_URL}`,
            }
        }
    }

    const { sanitizedTarget, ssrQuery } = _stripQuery(target)

    // validate target url
    if (!parse(sanitizedTarget).hostname) {
        return {
            err: {
                code: 400,
                type: '400 bad request',
                message: `could not construct valid url: ${target}`,
            }
        }
    }

    console.log(`[INFO] target parsed for handler '${handler}':`, target)
    return { target: sanitizedTarget, ssrQuery }
}

const endWithError = (res, err = {}) => {
    const { 
        code = 500, 
        type = '500 internal error', 
        message = 'uncaught exception',
    } = err

    res.statusCode = code;
    res.setHeader('Content-Type', 'text/plain');
    res.end(`${type}: ${message}`);
}

const endWithCache = (res, code, contentType, body, cacheMaxAge = 1) => {
    res.statusCode = code;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', `s-maxage=${cacheMaxAge}, stale-while-revalidate`);
    res.end(body);
}

module.exports = {
    getInt,
    parseTarget,
    endWithCache,
    endWithError,
};