var cheerio = require('cheerio'),
	moment = require('moment'),
	http = require('http'),
	request = require('request'),
	url = require('url'),
	zlib = require('zlib');

(function() {
	var address = '127.0.0.1',
		port = 9001;

	var upstream = (function() {
		var defaultOptions = {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.114 Safari/537.36'
				}
			},
			proxiedRequest = request.defaults({
				'proxy': 'http://localhost:8443'
			});

		function get(url, callback) {
			var options = defaultOptions;
			options.url = url;
			var requestObject = proxiedRequest.get(options);
			handleRequest(requestObject, callback);
		}

		function handleRequest(req, callback) {
			req.on('response', function(response) {
				var chunks = [];
				response.on('data', function(chunk) {
					chunks.push(chunk);
				}).on('end', function() {
					var buffer = Buffer.concat(chunks);
					var encoding = response.headers['content-encoding'];
					if (encoding == 'gzip') {
						zlib.gunzip(buffer, function(error, decoded) {
							callback(error, decoded && decoded.toString());
						});
					} else if (encoding == 'deflate') {
						zlib.inflate(buffer, function(error, decoded) {
							callback(error, decoded && decoded.toString());
						});
					} else {
						callback(null, buffer.toString());
					}
				});
			}).on('error', function(error) {
				callback(error);
			});
		}

		return {
			loadUrl: get
		};

	})();

	function start() {
		http.createServer(receive).listen(port, address);
		console.log('Server running on ' + address + ':' + port);
	}

	function receive(request, response) {
		var urlObject = url.parse(request.url, true);
		if (urlObject.query) {
			process(response, urlObject.query);
		} else {
			send(response, {code: 404});
		}
	}

	function process(response, query) {
		var upstreamUrl = '';
		switch(query.engine) {
			case 'piratebay':
				upstreamUrl = 'http://thepiratebay.se/search/' + encodeURIComponent(query.search) + '/0/7/0';
				break;
			case 'fenopy':
				upstreamUrl = 'http://fenopy.se/search/' + encodeURIComponent(query.search) + '.html?order=2';
				break;
			case 'torrenthound':
				upstreamUrl = 'http://www.torrenthound.com/search/1/' + encodeURIComponent(query.search) + '/seeds:desc';
				break;
		}
		upstream.loadUrl(upstreamUrl, function(error, data) {
			gotUpstreamResponse(query.engine, response, error, data);
		});
	}

	function gotUpstreamResponse(engine, response, error, data) {
		if (error) {
			console.log(error);
			send(response, {code: 500});
		} else {
			switch(engine) {
				case 'piratebay':
					Scraper_Pirate.parse(data, function(results) {
						send(response, {
							code: 200,
							body: results
						});
					});
					break;
				case 'fenopy':
					Scraper_Fenopy.parse(data, function(results) {
						send(response, {
							code: 200,
							body: results
						});
					});
					break;
				case 'torrenthound':
					Scraper_Torrenthound.parse(data, function(results) {
						send(response, {
							code: 200,
							body: results
						});
					});
			}
		}
	}

	function send(response, data) {
		var body = '';
		response.writeHead(data.code, {
			'Content-Type': 'text/plain'
		});
		if (data.code === 200) {
			body = JSON.stringify(data.body);
		}
		response.end(body);
	}

	start();

})();

var Scraper_Pirate = function(cheerio) {

	function getSearchResults(body, callback) {
		var tmpResults = [];
		if (body.indexOf('No hits.') == -1) {
			var $ = cheerio.load(body);
			$('#searchResult tr').each(function() {
				parseRow($(this), function(data) {
					tmpResults.push(data);
				});
			});
		}
		callback(tmpResults);
	}

	function parseRow(result, callback) {
		if (!result.hasClass('header')) {
			var link = result.find('.detName a');
			var name = link.html();
			var magnet = result.find("a[href^='magnet']").attr('href');

			var commentAlt = result.find('img[alt*="comment"]').attr('alt');
			var comments = 0;
			if (commentAlt) {
				comments = commentAlt.replace(/\D/g, '');
			}
			var dataArea = result.find('font.detDesc').html();
			if (!dataArea) {
				return false;
			}
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
				} else if (date[0] == 'Today') {
					var d = new Date();
					d.setHours(timeParts[0]);
					d.setMinutes(timeParts[1]);
					recordDate = moment(d).unix();
				} else {
					recordDate = moment().unix();
				}
			}
			if (!recordDate)
				recordDate = moment().unix();
			
			callback({
				'name': name,
				'magnet': magnet,
				'comments': comments,
				'seeds': parseInt(result.find('td').eq(2).text()),
				'peers': parseInt(result.find('td').eq(3).text()),
				'id': link.attr('href').split('/')[2],
				'size': size,
				'date': recordDate
			});
		}
	}

	return {
		parse: getSearchResults
	};

}(cheerio);

var Scraper_Fenopy = function(cheerio) {

	function getSearchResults(body, callback) {
		var tmpResults = [];
		if (body.indexOf('<h2>No match found</h2>') == -1) {
			var $ = cheerio.load(body);
			$('#search_table tbody tr').each(function() {
				parseRow($(this), function(data) {
					tmpResults.push(data);
				});
			});
		}
		callback(tmpResults);
	}

	function parseRow(result, callback) {
		callback({
			'name': result.find('td.c1 a').text(),
			'magnet': result.find("a[href^='magnet']").attr('href'),
			'comments': 0,
			'seeds': parseInt(result.find('td.se').text()),
			'peers': parseInt(result.find('td.le').text()),
			'size': result.find('td.si').eq(0).text(),
			'date': moment().unix()
		});
	}

	return {
		parse: getSearchResults
	};

}(cheerio);

var Scraper_Torrenthound = function(cheerio) {

	function getSearchResults(body, callback) {
		var tmpResults = [];
		if (body.indexOf('No working torrents were found') == -1) {
			var $ = cheerio.load(body, {
				normalizeWhitespace: true
			});
			$('.cat').remove();
			var table = $('table.searchtable').eq(1);
			var rows = table.find('tr');
			rows.each(function() {
				parseRow($(this), function(data) {
					tmpResults.push(data);
				});
			});
		}
		callback(tmpResults);
	}

	function parseRow(result, callback) {
		var nameCell = result.find('td').eq(0).find('a').text();
		callback({
			'name': nameCell.substring(2),
			'magnet': result.find("a[href^='magnet']").attr('href'),
			'comments': 0,
			'seeds': parseInt(result.find('span.seeds').text()),
			'peers': parseInt(result.find('span.leeches').text()),
			'size': result.find('span.size').text(),
			'date': moment().unix()
		});
	}

	return {
		parse: getSearchResults
	};

}(cheerio);