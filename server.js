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



  var getInjectableCSS = function(){
    return css_injectables['watermark'];
  };



  var screenshot = function (req, res) {
    var filetype = 'png';

    var loadFinished = function () {
        console.log(this.watermark);
        var s = '<div class="container">'+ this.watermark +'</div>'; // HTML string
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
      userAgent: 'Mozilla/5.0 (Windows NT x.y; Win64; x64; rv:10.0) Gecko/20100101 Firefox/10.0',
      extension: filetype,
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
    if (req.query.url && !validUrl.isUri(req.query.url)) {
      res.json({'error': 'Invalid url'});
      return;
    }

    if (req.query.filetype) {
      var allowed_types = ['png', 'pdf'];
      if (allowed_types.indexOf(req.query.filetype) == -1) {
        res.json({'error': 'Invalid file type'});
      }

      filetype = req.query.filetype;
    }

    if (req.query.height) {
      options.screenSize.height = req.query.height;
    }

    if (!req.query.width) {
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
    if (req.query.sendlink) {
      if (req.query.sendlink == 'true' || req.query.sendlink == true) {
        _sendlink = true;
      }
    }


    if (req.query.watermark) {
      if (req.query.watermark == 'false' || req.query.watermark == false) {
        options.onLoadFinished = null;
      }
    }


    var filename_no_ext = 'screenshot_' + utils.md5(url + JSON.stringify(options));
    var filename = filename_no_ext + '.' + filetype;
    var filePath = 'screenshots/' + filename;
    var our_host = (req.secure) ? 'https://' + req.headers.host : 'http://' + req.headers.host;
    //If an url is giving, fetch the webpage
    if (req.query.url) {
      if (fs.existsSync(filePath) && options.useCache === true) {
        console.log('Request for %s - Found in cache', req.query.url);
        if (!_sendlink) {
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

              if (!_sendlink) {
                res.sendFile(filePath, {root: __dirname}, function (err) {
                  console.log('Done sending file');
                  //fs.unlink('screenshots/' + filename);
                  fcs.addFile(filePath);
                });
              } else {
                res.json({'link': our_host + '/' + filePath});
                fcs.addFile(config.FileCleanerService.link_cache); //Timeout when sending a link @TODO make this a config option
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
  fs.readdir('css_inject', function(err, files) {
    if (err) return;
    files.forEach(function(f) {
      fs.readFile('css_inject/'+ f, 'utf8', function (err,data) {
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
