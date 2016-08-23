var config = {};

config.web ={};
config.web.port = process.env.WEB_PORT || 8080;
config.FileCleanerService = {};
config.FileCleanerService.link_cache = process.env.LINK_CACHE || 24 * 60 * 60000; // 1 day
config.FileCleanerService.cache = process.env.OUTPUT_CACHE || 60000; // 1 minute
config.watermark = {};
config.watermark.text = 'Powered By WebShot';
module.exports = config;