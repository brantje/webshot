var webshot = require('webshot');
var express = require('express');
var validUrl = require('valid-url');
var url = require("url");
var fs = require('fs');

var app = express();
app.get('/', function (req, res) {
    if (!req.query.url) {
        res.json({'error': 'Required param url missing'})
    }
    if(req.query.h){
        req.query.height = req.query.h;
    }
    if(req.query.w){
        req.query.width = req.query.w;
    }
    if (!req.query.height) {
        req.query.height = 1080
    }
    if(!req.query.width){
        req.query.width = 1920
    }

    if (!validUrl.isUri(req.query.url)){
        res.json({'error': 'Invalid url'})
    }
    var hostname = url.parse(req.query.url).hostname;
    var now = new Date().getTime()/1000;
    var filename = hostname + '_' + now;

    var options = {
        screenSize: {
            width: req.query.width,
            height: req.query.height
        },
        streamType: 'png',
        userAgent: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.20 (KHTML, like Gecko) Mobile/7B298g'
    };


    console.log('Taking screenshot from: '+ req.query.url);
    webshot(req.query.url, 'screenshots/'+ filename +'.png', options, function(err) {
        res.sendFile( 'screenshots/'+filename +'.png', { root: __dirname }, function(err){
            console.log('Done sending file')
            fs.unlink('screenshots/'+ filename +'.png');
        });

    });
});

var dir = 'screenshots';

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

app.listen(8080, function () {
    console.log('Example WebShot listening on port 8080!');
});

