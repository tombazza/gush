var request = require('request');
var cheerio = require('cheerio');
var moment = require('moment');
var url = require('url');

var r = request.defaults({
	'proxy': 'http://localhost:8443'
});

var Scraper = function() {

	function startService() {
		var http = require('http');
		http.createServer(handleRequest).listen(9001, '127.0.0.1');
		console.log('Server running at http://127.0.0.1:9001/');
	}

	function handleRequest(request, response) {
		var urlObj = url.parse(request.url, true);
		if(urlObj.query.engine == 'piratebay') {
			Scraper_Pirate.search(urlObj.query.search, function(data) {
				sendResponse(response, data);
			});
		} else {
			sendError(response, 404);
		}
	}

	function sendResponse(response, data) {
		response.writeHead(200, {
			'Content-Type': 'text/plain'
		});
		response.end(JSON.stringify(data));
	}

	function sendError(response, code) {
		response.writeHead(code, {
			'Content-Type': 'text/plain'
		});
		response.end();
	}

	return {
		init: startService
	};
}();

Scraper.init();

var Scraper_Pirate = function(cheerio, request) {

	var resultCallback = null,
		responseSet = [];

    function getSearchResults(query, callback) {
        responseSet = [];
        resultCallback = callback;
        var options = {
            url: 'http://thepiratebay.pe/search/' + encodeURIComponent(query) + '/0/7/0',
            headers: {
                'User-Agent': 'Mozilla/5.0 (MSIE 9.0; Windows NT 6.1; Trident/5.0)'
            }
        };
        request.get(options, function (error, response, body) {
            if (error)
                throw error;
            if(body.indexOf('No hits.') == -1) {
                var $ = cheerio.load(body);
                $('#searchResult tr').each(function() {
                    parseRow(this, $);
                });
            }
            callback(responseSet);
        });
    }
    
	function parseRow(row, $) {
		var result = $(row);
		if (!result.hasClass('header')) {
			var link = result.find('.detName a');
			var name = link.html();
			var magnet = result.find("a[href^='magnet']").attr('href');

			var commentAlt = result.find('img[alt*="comment"]').attr('alt');
			if (commentAlt) {
				var comments = commentAlt.replace(/\D/g, '');
			} else {
				var comments = '0';
			}
			var dataArea = result.find('font.detDesc').html();
			if (!dataArea) return true;
			var data = dataArea.split(',');
			
			var size = data[1].replace(' Size ', '').replace('&nbsp;', ' ');
			var date = data[0].replace('Uploaded ', '').split('&nbsp;');
			var recordDate = moment().unix();
			if (date[1].indexOf('mins') != -1) {
				var prevTime = date[0].replace(/\D/g, '');
				var d = new Date();
				d.setMinutes(d.getMinutes() - prevTime);
				var recordDate = moment(d).unix();
			} else if (date[1].indexOf(':') == -1) {
				// full date supplied
				var monthParts = date[0].split('-');
				recordDate = moment(new Date(date[1], monthParts[0], monthParts[1], 15, 0, 0, 0)).unix();
			} else {
				var timeParts = date[1].split(':');
				if (date[0] == 'Y-day') {
					var d = new Date();
					d.setDate(d.getDate() - 1);
					d.setHours(timeParts[0]);
					d.setMinutes(timeParts[1]);
					recordDate = moment(d).unix();
				} else if(date[0] == 'Today') {
					var d = new Date();
					d.setHours(timeParts[0]);
					d.setMinutes(timeParts[1]);
					recordDate = moment(d).unix();
				} else {
					recordDate = moment().unix();
				}
			}
			if(!recordDate) recordDate = moment().unix();
			responseSet.push({
				'name': name,
				'magnet': magnet,
				'comments': comments,
				'seeds': result.find('td').eq(2).text(),
				'peers': result.find('td').eq(3).text(),
				'id': link.attr('href').split('/')[2],
				'size': size,
				'date': recordDate
			});
		}
	}

	return {
		search: getSearchResults
	};

} (cheerio, r);
