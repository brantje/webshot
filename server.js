module.exports = function (cluster, workerProcess) {
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
  var fcs = new FileCleanerService(config.FileCleanerService.cache); //1 Minute
  app.use(bodyParser.urlencoded({
    extended: true
  }));

  app.use("/screenshots", express.static(__dirname + '/screenshots'));
  app.use("/tmp", express.static(__dirname + '/tmp'));

  app.use(bodyParser.json());


  var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.send(200);
    }
    else {
      next();
    }
  };
  app.use(allowCrossDomain);

  var getInjectableCSS = function () {
    return css_injectables['watermark'];
  };


  var screenshot = function (req, res) {
    var loadFinished = function () {
      if (!this.watermark) {
        return;
      }

      var s = '<div class="container">' + this.watermark + '</div>'; // HTML string
      var div = document.createElement('div');
      div.className = 'watermark_wrapper';
      div.innerHTML = s;
      document.body.appendChild(div);
    };

    var css_rules = getInjectableCSS(req);

    var options = {
      url: '',
      screenSize: {},
      shotSize: {
        width: 'window',
        height: 'window'
      },
      phanthomConfig: {
        'ignore-ssl-errors': false
      },
      //customCSS: css_injectables['watermark'],
      customCSS: css_rules,
      streamType: 'png',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
      quality: 75,
      useCache: true,
      cookies: [],
      customHeaders: null,
      onLoadFinished: {
        fn: loadFinished,
        context: {watermark: config.watermark.text}
      }
    };


    if (utils.isEmpty(req.query.url) && utils.isEmpty(req.body)) {
      res.json({'error': 'Required param missing'});
      return;
    } else {
      if (req.query.url) {
        options.url = req.query.url;
      }
    }

    /**
     * @TODO merge options
     */
    if (req.body.options) {
      for (var attrname in req.body.options) {
        options[attrname] = req.body.options[attrname];
      }
    }

    if (options.url && !validUrl.isUri(options.url)) {
      res.json({'error': 'Invalid url'});
      return;
    }

    if (req.query.filetype) {
      var allowed_types = ['png', 'pdf', 'jpg', 'jpeg'];
      if (allowed_types.indexOf(req.query.filetype) == -1) {
        res.json({'error': 'Invalid file type'});
      }

      options.streamType = req.query.filetype;
    }

    if (req.query.height) {
      options.screenSize.height = req.query.height;
    }

    if (req.query.width) {
      options.screenSize.width = req.query.width;
    }

    if (req.query.quality) {
      options.quality = req.query.quality;
    }

    if (req.query.ignoresslerrors) {
      options.phanthomConfig['ignore-ssl-errors'] = true
    }

    if (req.query.userAgent) {
      options.userAgent = req.query.userAgent;
    }

    if (req.query.nocache) {
      options.useCache = false;
    }

    var _sendlink = false;
    if (req.query.sendlink || req.body.options) {
      if (req.query.sendlink == 'true' || req.query.sendlink == true || req.body.options) {
        _sendlink = true;
      }
    }


    if (req.query.watermark) {
      if (req.query.watermark == 'false' || req.query.watermark == false) {
        options.onLoadFinished = null;
      }
    }


    var filename_no_ext = 'screenshot_' + utils.md5(url + JSON.stringify(options));
    var filename = filename_no_ext + '.' + options.streamType;
    var filePath = 'screenshots/' + filename;
    var our_host = (req.secure) ? 'https://' + req.headers.host : 'http://' + req.headers.host;
    //If an url is giving, fetch the webpage
    if (options.url) {
      if (fs.existsSync(filePath) && (options.useCache == true || options.useCache == 'true') ) {
        console.log('Request for %s - Found in cache', options.url);
        if (!_sendlink) {
          res.sendFile(filePath, {root: __dirname}, function (err) {
            console.log('Done sending  cached file');
          });
        } else {
          res.json({'link': our_host + '/' + filePath});
          console.log('Done sending link');
        }

        return;
      }


      var hostname = url.parse(options.url).hostname;
      dns.resolve4(hostname, function (err, addresses) {
        if (err) {
          res.json({'error': 'Hostname not found'});
        } else {
          console.log('Taking screenshot from: ' + options.url);
          webshot(options.url, filePath, options, function (err) {
            if (!err) {

              if (!_sendlink) {
                res.sendFile(filePath, {root: __dirname}, function (err) {
                  console.log('Done sending file');
                  //fs.unlink('screenshots/' + filename);
                  fcs.addFile(filePath);
                });
              } else {
                res.json({'link': our_host + '/' + filePath});
                fcs.addFile(filePath, config.FileCleanerService.link_cache); //Timeout when sending a link @TODO make this a config option
                console.log('Done sending link');
              }


            } else {
              res.json({'error': 'PhantomJS exited with return value 1'});
            }
          });
        }

      });
    }

    if (req.body.html_string) {
      options.shotSize = {
        width: 'all',
        height: 'all'
      };

      var tmp_file = filename_no_ext + '.html';
      fs.writeFile('tmp/' + tmp_file, req.body.html_string, function (err) {
        if (err) {
          return console.log(err);
        }
        var tmp_url = our_host + '/tmp/' + tmp_file;
        webshot(tmp_url, filePath, options, function (err) {
          if (!err) {

            if (!_sendlink) {
              res.sendFile(filePath, {root: __dirname}, function (err) {
                console.log('Done sending file');
                //fs.unlink('screenshots/' + filename);
                fcs.addFile(filePath);
              });
            } else {
              res.json({'link': our_host + '/' + filePath});
              fcs.addFile(config.FileCleanerService.link_cache); //Timeout when sending a link
              console.log('Done sending link');
            }

            fs.unlinkSync('tmp/' + tmp_file);
          } else {
            res.json({'error': 'PhantomJS exited with return value 1'});
          }
        });
      });
    }
  };


  /**
   * Gather all injectable css files
   */

  var css_injectables = [];
  fs.readdir('css_inject', function (err, files) {
    if (err) return;
    files.forEach(function (f) {
      fs.readFile('css_inject/' + f, 'utf8', function (err, data) {
        var filename = f.split('.')[0];
        css_injectables[filename] = data
      });
    });
  });

  /**
   * End css injectables
   */

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

if (!module.parent) {
  require('./server')();
}
