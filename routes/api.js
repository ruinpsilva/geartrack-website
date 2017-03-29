const express = require('express')
const router = express.Router()
const geartrack = require('geartrack')
const mcache = require('memory-cache')
const http = require('http')

/**
 * Cache middleware
 * Caches the response for a period of time
 *
 * Uses memory cache (RAM)
 * @param minutes
 * @param type default = json
 * @return {function(*, *, *)}
 */
const cache = (minutes, type = 'json') => {
    return (req, res, next) => {
        let key = req.originalUrl
        let cachedBody = mcache.get(key)
        res.type(type)

        if (cachedBody) {
            let body = JSON.parse(cachedBody) // we know that is json
            if(body.error) res.status(400)

            res.send(cachedBody)
            return
        }

        res.sendResponse = res.send
        res.send = (body) => {
            mcache.put(key, body, minutes * 60 * 1000); //ms
            res.sendResponse(body)
        }
        next()
    }
}

// All this routes will be cached for 10 minutes
router.use(cache(10))

/**
 * Sky data
 */
router.get('/sky', validateId, function (req, res) {
    let id = req.query.id

    geartrack.sky.getInfo(id, (err, skyEntity) => {
        if (err) {
            res.status(400).json({error: "No data was found for that id!"})
            return
        }

        if (skyEntity.id.charAt(0) == 'P' && skyEntity.messages.length == 0) {
            res.status(400).json({error: "Empty data from sky!"})
            return
        }

        skyEntity.name = id.charAt(0) + id.charAt(1)

        res.json(skyEntity)
    })
});


/**
 * Correos data
 */
router.get('/correos', validateId, validatePostalCode,function (req, res) {
    let id = req.query.id, postalcode = req.query.postalcode

    geartrack.correos.getInfo(id, postalcode, (err, correosEntity) => {
        if (err) {
            res.status(400).json({error: "No data was found for that id!"})
            return
        }

        res.json(correosEntity)
    })
});


/**
 * Adicional data
 */
router.get('/adicional', validateId, validatePostalCode, function (req, res) {
    let id = req.query.id, postalcode = req.query.postalcode

    geartrack.adicional.getInfo(id, postalcode, (err, adicionalEntity) => {
        if (err) {
            res.status(400).json({error: "No data was found for that id!"})
            return
        }

        res.json(adicionalEntity)
    })
});


/**
 * Expresso24 data
 */
router.get('/expresso24', validateId, function (req, res) {
    let id = req.query.id

    geartrack.expresso24.getInfo(id, (err, expressoInfo) => {
        if (err) {
            res.status(400).json({error: "No data was found for that id!"})
            return
        }

        res.json(expressoInfo)
    })
});

/**
 * Singpost
 */
router.get('/singpost', validateId, function (req, res) {
    let id = req.query.id

    geartrack.singpost.getInfo(id, (err, singpost) => {
        if (err) {
            res.status(400).json({error: "No data was found for that id!"})
            return
        }

        singpost.messages = singpost.messages.map(m => {
            m.status =  m.status.replace(/ \(Country.+\)/ig, "")
            return m
        })

        res.json(singpost)
    })
});

/**
 * CTT
 */
router.get('/ctt', validateId, function (req, res) {
    let id = req.query.id

    request(id, (err, ctt) => {
        if(ctt.error) {
            res.status(400).json({error: "No data was found for that id!"})
            return
        }

        res.json(ctt)
    })



    // geartrack.ctt.getInfo(id, (err, ctt) => {
    //     if (err) {
    //         res.status(400).json({error: "No data was found for that id!"})
    //         return
    //     }
    //
    //     res.json(ctt)
    // })
});

function request(id, cb) {
        return http.get({
            host: '178.32.113.93',
            port: 3000,
            path: '/api/ctt?id=' + id
        }, function(response) {
            // Continuously update stream with data
            var body = '';
            response.on('data', function(d) {
                body += d;
            });
            response.on('end', function() {
                var parsed = JSON.parse(body);
                cb(null, parsed);
            });
        });
}

/**
 * Cainiao
 */
router.get('/cainiao', validateId, function (req, res) {
    let id = req.query.id

    geartrack.cainiao.getInfo(id, (err, cainiao) => {
        if (err) {
            res.status(400).json({error: "No data was found for that id!"})
            return
        }

        cainiao.messages = cainiao.messages.map(m => {
            m.status = m.status.replace('[-]', '')

            return m
        })

        res.json(cainiao)
    })
});
/*
|--------------------------------------------------------------------------
| Validation Middlewares
|--------------------------------------------------------------------------
*/
function validateId(req, res, next) {
    let id = req.query.id

    if (!id) {
        res.status(400).json({error: "ID must be passed in the query string!"})
        return
    }

    next()
}

function validatePostalCode(req, res, next) {
    let postalcode = req.query.postalcode

    if (!postalcode) {
        res.status(400).json({error: "Postalcode must be passed in the query string!"})
        return
    }

    next()
}

module.exports = router;
