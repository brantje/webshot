module.exports = function(cluster,workerProcess) {
    var config = require('./config/config.js');
    var path = require('path');
    var webshot = require('webshot');
    var express = require('express');
    var validUrl = require('valid-url');
    var url = require("url");
    var FileCleanerService = require('./lib/fileCleanerService');
    var utils = require('./lib/utils');
    var fs = require('fs');
    var dns = require('dns');
    var bodyParser = require('body-parser');
    var app = express();
    var fcs = new FileCleanerService(60000); //1 Minute @TODO: Make this a config option
    app.use(bodyParser.urlencoded({
        extended: true
    }));

    app.use("/screenshots", express.static(__dirname + '/screenshots'));
    app.use("/tmp", express.static(__dirname + '/tmp'));

    app.use(bodyParser.json());

    var screenshot = function (req, res) {
        var filetype = 'png';

        if (!req.query.url && !req.body) {
            res.json({'error': 'Required param missing'});
            return;
        }
        if (req.query.url && !validUrl.isUri(req.query.url)) {
            res.json({'error': 'Invalid url'});
            return;
        }

        if (req.query.h) {
            req.query.height = req.query.h;
        }

        if (req.query.w) {
            req.query.width = req.query.w;
        }

        if (req.query.q) {
            req.query.quality = req.query.q;
        }

        if (req.query.pdf) {
            filetype = 'pdf';
        }

        if (!req.query.height) {
            req.query.height = 1080
        }

        if (!req.query.width) {
            req.query.width = 1920
        }

        if (!req.query.quality) {
            req.query.quality = 75
        }

        if (!req.query.ignoresslerrors) {
            req.query.ignoresslerrors = false
        }

        if (!req.query.userAgent) {
            req.query.userAgent = 'Mozilla/5.0 (Windows NT x.y; Win64; x64; rv:10.0) Gecko/20100101 Firefox/10.0';
        }

        if (!req.query.nocache) {
            req.query.nocache = false;
        }

        if (!req.query.sendlink) {
            req.query.sendlink = false;
        }


        var options = {
            url: req.query.url,
            screenSize: {
                width: req.query.width,
                height: req.query.height
            },
            phanthomConfig: {
                'ignore-ssl-errors': req.query.ignoresslerrors
            },
            streamType: 'png',
            userAgent: req.query.userAgent,
            extension: filetype
        };
        var filename_no_ext = 'screenshot_' + utils.md5(url + JSON.stringify(options));
        filename = filename_no_ext + '.' + filetype;
        var filePath = 'screenshots/' + filename;
        var our_host = (req.secure) ? 'https://' + req.headers.host : 'http://' + req.headers.host;
        //If an url is giving, fetch the webpage
        if (req.query.url) {
            if (fs.existsSync(filePath) && req.query.nocache === false) {
                console.log('Request for %s - Found in cache', req.query.url);
                if (!req.query.sendlink) {
                    res.sendFile(filePath, {root: __dirname}, function (err) {
                        console.log('Done sending  cached file');
                    });
                } else {
                    res.json({'link': our_host + '/' + filePath})
                }

                return;
            }


            var hostname = url.parse(req.query.url).hostname;
            dns.resolve4(hostname, function (err, addresses) {
                if (err) {
                    console.log(err);
                    res.json({'error': 'Hostname not found'});
                } else {
                    console.log('Taking screenshot from: ' + req.query.url);
                    webshot(req.query.url, filePath, options, function (err) {
                        if (!err) {

                            if (!req.query.sendlink) {
                                res.sendFile(filePath, {root: __dirname}, function (err) {
                                    console.log('Done sending file');
                                    //fs.unlink('screenshots/' + filename);
                                    fcs.addFile(filePath);
                                });
                            } else {
                                res.json({'link': our_host + '/' + filePath});
                                fcs.addFile(filePath, 24 * 60 * 60000); //Timeout when sending a link @TODO make this a config option
                            }


                        } else {
                            res.json({'error': 'PhantomJS exited with return value 1'});
                        }
                    });
                }

            });
        }

        if (req.body.html_string) {

            var tmp_file = filename_no_ext + '.html';
            fs.writeFile('tmp/' + tmp_file, req.body.html_string, function (err) {
                if (err) {
                    return console.log(err);
                }
                var tmp_url = our_host + '/tmp/' + tmp_file;
                webshot(tmp_url, filePath, options, function (err) {
                    if (!err) {

                        if (!req.query.sendlink) {
                            res.sendFile(filePath, {root: __dirname}, function (err) {
                                console.log('Done sending file');
                                //fs.unlink('screenshots/' + filename);
                                fcs.addFile(filePath);
                            });
                        } else {
                            res.json({'link': our_host + '/' + filePath});
                            fcs.addFile(filePath, 24 * 60 * 60000); //Timeout when sending a link @TODO make this a config option
                        }

                        fs.unlinkSync('tmp/' + tmp_file);
                    } else {
                        res.json({'error': 'PhantomJS exited with return value 1'});
                    }
                });
            });
        }
    };

    app.get('/', screenshot);
    app.post('/', screenshot);


    var dirs = ['screenshots', 'tmp'];
    for (var i = 0; i < dirs.length; i++) {
        if (!fs.existsSync(dirs[i])) {
            fs.mkdirSync(dirs[i]);
        }

    }

    app.listen(config.web.port, function () {
        console.log('WebShot listening on port %s!', config.web.port);
    });

};

if(!module.parent){
    require('./server')();
}
