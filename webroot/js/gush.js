/*

Gush - Aggregating torrent search engine
Copyright (C) 2013 tombazza

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/
var settings = {
	dataEndpoint: 'data.php',
	numberEngines: 3
};

(function($, $Config) {
	var searchTable = false,
		resultsIndex = [],
		error = false,
		resultsWrapper = false;
	
	var templateEngine = (function() {
		var templates = [];
			
		function init() {
			$('script[type="text/mustache"]').each(function() {
				var template = $(this);
				templates[template.attr('id')] = template.html();
			});
		}
		
		function render(templateId, data) {
			return Mustache.render(templates[templateId], data);
		}
		
		return {
			init: init,
			render: render
		};
	})();
	
	var eventHandler = (function() {
		var searchBox;
		
		function init() {
			searchBox = $('#query');
			registerHandlers();
		}
		
		function registerHandlers() {
			$(document).on('keydown', '#query', submitForm);
			$(document).on('focus', '#query', focusForm);
			$(document).on('blur', '#query', blurForm);
			$(document).on('click', '.info_content .tab-names li a', tabClick);
			$(document).on('click', '#comments-page div', handleCommentClick);
			connectionManager.setLoadingCallback(function() {
				searchBox.addClass('loading');
			}, function() {
				searchBox.removeClass('loading');
			});
		}
		
		function focusForm(e) {
			searchBox.addClass('focus');
			if (!connectionManager.hasAuth()) {
				$(this).removeClass('passcode').val('').attr('type', 'password');
			}
		}

		function blurForm(e) {
			searchBox.removeClass('focus');
			if (!connectionManager.hasAuth() && !error) {
				$(this).val('').attr('type', 'text').val('passcode?');
			}
		}

		function submitForm(e) {
			if (e.which == 13 && searchBox.val().length > 0) {
				if (!connectionManager.hasAuth()) {
					connectionManager.performLogin($(this).val(), postAuth);
				} else {
					performSearch();
					$(this).blur();
				}
			}
		}
		
		function postAuth() {
			$('body').removeClass('load');
			$('#query').replaceWith('<input type="text" id="query" name="query" placeholder="Search">');
			searchBox = $('#query');
			searchBox.focus();
		}
		
		function tabClick(e) {
			e.preventDefault();
			var parent = $(this).parent('li');
			$('.info_content .tab-names li').removeClass('selected');
			parent.addClass('selected');
			var id = parent.attr('id').replace('-tab', '');
			$('.tab-contents').hide();
			$('#' + id + '-page').show();
			return false;
		}
		
		function performSearch() {
			error = false;
			$('#status').removeClass('error');
			if (searchTable) searchTable.clear();
			resultsIndex = [];
			connectionManager.submitSearch($('#query').val(), searchResponse);
		}
		
		function handleCommentClick() {
			$(this).toggleClass('visible');
		}
	
		return {
			init: init
		};
	})();
	
	function init() {
		templateEngine.init();
		eventHandler.init();
		connectionManager.init();
		
		$(window).resize(sizeResultsArea);
		$('#status').click(function() {
		   $(this).removeClass('error');
		   sizeResultsArea();
		});
		jQuery.extend(jQuery.fn.dataTableExt.oSort, {
			"file-size-pre": function (a) {
				var x = a.substring(0, a.length - 2);
				var x_unit = (a.substring(a.length - 2, a.length) == "MB" ? 1000 : (a.substring(a.length - 2, a.length) == "GB" ? 1000000 : 1));
				return parseInt(x * x_unit, 10);
			},
			"file-size-asc": function (a, b) {
				return ((a < b) ? -1 : ((a > b) ? 1 : 0));
			},
			"file-size-desc": function (a, b) {
				return ((a < b) ? 1 : ((a > b) ? -1 : 0));
			}
		});
	}

	function sizeResultsArea() {
		headerHeight = $('#header').outerHeight();
		resultsWrapper = $('#results_wrapper');
		if(resultsWrapper) {
			var calcHeight = ($(window).height() - headerHeight);
			resultsWrapper.css('height', calcHeight + 'px');
			return calcHeight;
		}
	}	

	var connectionManager = function () {
		var passcode = '',
			authenticated = false,
			startLoadCallback = null,
			endLoadCallback = null,
			requests = null;
	
		function requestManager(startCallback, endCallback) {
			var activeRequests = {},
				loading = false,
				requestCount = 0,
				requestBuffer = {};
			
			function checkSize() {
				var size = 0;
				for(var i in activeRequests) {
					if(activeRequests.hasOwnProperty(i)) size++;
				}
				if(loading && size == 0) {
					loading = false;
					endCallback();
				}
			}
			
			function add(post, callback) {
				if(!loading) {
					loading = true;
					startCallback();
				}
				requestCount = requestCount + 1;
				var requestId = requestCount;
				var requestString = JSON.stringify(post);
				if(!inObject(requestString, requestBuffer)) {
					activeRequests[requestId] = $.ajax({
						type: "POST",
						url: $Config.dataEndpoint,
						data: post,
						dataType: 'json',
						success: function (data) {
							remove(requestId);
							if (checkErrorState(data)) {
								requestBuffer[requestString] = data;
								callback(data);
							}
						},
						error: function (xhr, status, error) {
							remove(requestId);
							displayError({
								message: 'Request failed',
								code: 1
							});
						}
					});
				} else {
					checkSize();
					callback(requestBuffer[requestString]);
				}
			}
			
			function remove(requestId) {
				if(inObject(requestId, activeRequests)) delete activeRequests[requestId];
				checkSize();
			}
			
			function terminateRequests() {
				$.each(activeRequests, function (id, xhr) {
					if (xhr) xhr.abort();
				});
			}
			
			function checkErrorState(data) {
				if (data.error) {
					if(data.error.code == 2) terminateRequests();
					displayError(data.error);
					return false;
				}
				return true;
			}
			
			return {
				add: add
			};
		}
		
		function setLoadingCallback(loadingStart, loadingEnd) {
			startLoadCallback = loadingStart;
			endLoadCallback = loadingEnd;
		}
		
		function init() {
			requests = requestManager(startLoadCallback, endLoadCallback);
		}

		function performLogin(code, callback) {
			passcode = $.trim(code);
			requests.add({
				a: 'auth',
				p: passcode
			}, function (data) {
				if (data.auth) {
					authenticated = true;
					callback();
				}
			});
		}

		function submitSearch(query, callback) {
			for (i = 0; i < $Config.numberEngines; i++) {
				requests.add({
					a: 'search',
					e: i,
					q: query,
					p: passcode
				}, callback);
			}
		}

		function getMetadata(id, engine, callback) {
			requests.add({
				a: 'metadata',
				e: engine,
				i: id,
				p: passcode
			}, callback);
		}
		
		function getTrackers(hash, callback) {
			requests.add({
				a: 'trackers',
				p: passcode,
				h: hash
			}, callback);
		}

		function getAuthenticated() {
			return authenticated;
		}

		return {
			init: init,
			setLoadingCallback: setLoadingCallback,
			performLogin: performLogin,
			submitSearch: submitSearch,
			hasAuth: getAuthenticated,
			getMeta: getMetadata,
			getTrackers: getTrackers
		};
	}();

	

	function displayError(response) {
		error = true;
		$('#status').removeClass().addClass('error');
		$('#status').html('Error: ' + response.message);
		sizeResultsArea();
		if (response.code == 2) {
			$('#query').attr('disabled', 'disabled').blur();
			setTimeout(function () {
				window.location = window.location;
			}, 1500);
		}
	}
	
	function searchResponse(data) {
		var tableData = {
			paging: false,
			ordering: true,
			info: false,
			searching: false,
			data: [],
			columns: [{
				title: 'Name',
				width: '70%'
			}, {
				title: 'Date'
			}, {
				title: 'Size',
				type: 'file-size'
			}, {
				title: 'Seeds'
			}, {
				title: 'Peers'
			}, {
				visible: false
			}, {
				visible: false
			}],
			"scrollY": (sizeResultsArea() - 32),
			"scrollCollapse": false,
			order: [[3, 'desc']],
			autoWidth: true
		};
		$.each(data, function (key, item) {
			var hash = item.hash.toUpperCase();
			if (typeof (resultsIndex[hash]) === 'undefined') {
				resultsIndex[hash] = item;
				resultsIndex[hash].metadata = [item.metadata];
				resultsIndex[hash].magnetParts.tr = deduplicateTrackers(resultsIndex[hash].magnetParts.tr);
				var maxLength = 50;
				var trimmedName = item.name.length > maxLength ? item.name.substring(0, (maxLength - 3)) + '...' : item.name.substring(0, maxLength);
				tableData.data.push([
					trimmedName,
					moment.unix(item.date).format('YYYY-MM-DD HH:mm'),
					item.size,
					item.seeds,
					item.peers,
					hash,
					item.date
				]);
			} else {
				// add trackers to list
				var trackers = resultsIndex[hash].magnetParts.tr;
				resultsIndex[hash].magnetParts.tr = deduplicateTrackers(trackers.concat(item.magnetParts.tr));
				resultsIndex[hash].metadata.push(item.metadata);
				if(typeof (item.comments) !== 'undefined') resultsIndex[hash].comments = (resultsIndex[hash].comments + item.comments);
			}
		});
		initTable(tableData);
	}
	
	function deduplicateTrackers(trackers) {
		var uniqueTrackers = [];
		$.each(trackers, function(i, el){
			if($.inArray(el, uniqueTrackers) === -1) uniqueTrackers.push(el);
		});
		return uniqueTrackers;
	}

	function initTable(tableData) {
		if (!searchTable) {
			searchTable = $('#results').DataTable(tableData);
		} else {
			searchTable.rows.add(tableData.data).draw();
		}
		sizeResultsArea();
		$('#results tbody tr').unbind('click');
		$('#results tbody tr').bind('click', function () {
			var tr = $(this);
			var row = searchTable.row(tr);
			if (row.child.isShown()) {
				row.child.hide();
				tr.removeClass('row-open');
			} else {
				$.each($('#results tbody tr'), function() {
					var row = searchTable.row($(this));
					if(row.child.isShown()) {
						row.child.hide();
						$(this).removeClass('row-open');
					}
				});
				tr.addClass('row-open');
				row.child(drawInfoRow(row.data()[5]), 'info_row').show();
			}
		});
	}

	function drawInfoRow(hash) {
		var torrentData = resultsIndex[hash],
			templateData = {},
			infoRow = '';
		if (torrentData.comments) {
			templateData.comments = parseComments(torrentData.comments);
		}
		
		$.each(torrentData.metadata, function (id, meta) {
			if((typeof meta) != 'undefined') {
				connectionManager.getMeta(meta.id, meta.name, receiveMetaData);
			}
		});
		if(!torrentData.trackersLoaded) {
			templateData.infoPage = drawInfoPage(hash, true);
			connectionManager.getTrackers(hash, function(trackers) {
				setTimeout(receiveTrackers(hash, trackers), 1000);
			});
		} else {
			templateData.infoPage = drawInfoPage(hash, false);
		}
		infoRow = templateEngine.render('infoRow', templateData);
		return infoRow;
	}
	
	function drawInfoPage(hash, loading) {
		var torrentData = resultsIndex[hash],
			templateData = {};
		templateData.trackers = [];
		templateData.torrentName = torrentData.name;
		templateData.magnetLink = buildMagnetUri(torrentData);
		templateData.loadingTrackers = loading;
		$.each(torrentData.magnetParts.tr, function(id, tracker) {
			templateData.trackers.push({trackerName: decodeURIComponent(tracker)});
		});
		return templateEngine.render('infoPageContent', templateData);
	}
	
	function buildMagnetUri(torrentData) {
		var magnetURI = 'magnet:?xt=' + torrentData.magnetParts.xt[0] + '&tr=';
		magnetURI += torrentData.magnetParts.tr.join('&tr=') + '&dn=' + torrentData.magnetParts.dn[0];
		return magnetURI;
	}
	
	function receiveMetaData(data) {
		if (data.files.length) {
			var filesPage = $('#file-page');
			var fileList = {files: []};
			if (filesPage.html() == '') {
				fileList.files = data.files;
				filesPage.html(templateEngine.render('filePageContent', fileList));
			}
		}
		if (data.comments) {
			var commentsPage = $('#comments-page');
			var previousComments = commentsPage.find('div');
			var commentList = {comments: []};
			$.each(data.comments, function(id, comment) {
				if(comment) {
					commentList.comments.push({comment: comment});
				}
			});
			$.each(previousComments, function(id, comment) {
				if(comment) {
					commentList.comments.push({comment: $(this).text()});
				}
			});
			commentsPage.html(templateEngine.render('commentsPageContent', parseComments(commentList.comments)));
			$('#comments-tab a').html('Comments (' + commentList.comments.length + ')');
		}
	}
	
	function receiveTrackers(hash, trackers) {
		var torrentData = resultsIndex[hash],
			newTrackerList = torrentData.magnetParts.tr.concat(trackers);
		resultsIndex[hash].magnetParts.tr = deduplicateTrackers(newTrackerList);
		resultsIndex[hash].trackersLoaded = true;
		$('#info-page').html(drawInfoPage(hash, false));
	}
	
	function parseComments(comments) {
		if((typeof comments) != "object") return;
		var commentOutput = {comments: []},
			maxLength = 30;
		$.each(comments, function(id, comment) {
			var text = comment.comment;
			var output = {};
			if(text.length <= maxLength) {
				output.commentStart = text;
			} else {
				output.commentStart = text.substr(0, maxLength);
				output.commentRemainder = text.substr(maxLength);
			}
			commentOutput.comments.push(output);
		});
		return commentOutput;
	}
	
	function inObject(needle, haystack) {
		for(var key in haystack) {
			if(haystack.hasOwnProperty(key) && key == needle) return true;
		}
		return false;
	}

	$(document).ready(init);
	
})(jQuery, settings);