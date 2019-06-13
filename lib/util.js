// util.js does util-related works and logs
// the works with regard to given handler name.

const { parse, URL } = require('url')
const qs = require('querystring')

const PUPPET_QUERY_PREFIX = '_pq_'

module.exports = (handlerName) => {
    if (!handlerName) {
        throw new Error('handlerName argument must not be empty')
    }

    // vars accessible in util context
    let _target = '<target not set>'
    let _handlerName = handlerName

    const getInt = (str) => {
        return /[0-9]+/.test(str) ? parseInt(str) : undefined;
    }

    // remove internal params from target url
    const _stripQuery = (targetURL) => {
        let { protocol, host, query } = parse(targetURL, true)

        // extract ssr query from target url
        let puppetQuery = {}
        Object.keys(query).forEach(k => {
            if (k.startsWith(PUPPET_QUERY_PREFIX)) {
                const key = k.replace(PUPPET_QUERY_PREFIX, '')
                puppetQuery[key] = query[k]
                delete query[k]
            }
        })
        
        const newQuery = qs.stringify(query)
        if (newQuery.length) {
            sanitizedTarget = `${protocol}//${host}?${newQuery}`
        } else {
            sanitizedTarget = `${protocol}//${host}`
        }

        return {
            puppetQuery,
            sanitizedTarget,
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

        const { sanitizedTarget, puppetQuery } = _stripQuery(target)

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

        console.log(
            `[INFO] target parsed for handler '${handler}': ${target}`,
            "\n",
            `puppetQuery ('${PUPPET_QUERY_PREFIX}' prefix):`, puppetQuery
        )

        // assign parsed target to util's _target
        _target = sanitizedTarget

        return { target: sanitizedTarget, puppetQuery }
    }

    const endWithCache = (res, code, contentType, body, cacheMaxAge = 1) => {
        res.statusCode = code;
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', `s-maxage=${cacheMaxAge}, stale-while-revalidate`);
        res.end(body);

        console.log(`[DONE] handler '${_handlerName}':`, _target);
    }

    const endWithError = (res, err = {}, errorObject) => {
        const { 
            code = 500, 
            type = '500 internal error', 
            message = 'uncaught exception',
        } = err

        res.statusCode = code;
        res.setHeader('Content-Type', 'text/plain');
        res.end(`${type}: ${message}`);

        console.log(`[ERROR] handler '${_handlerName}' (${_target}): ${message}. trace:`, errorObject);
    }

    return {
        getInt,
        parseTarget,
        endWithCache,
        endWithError,
    }
}
