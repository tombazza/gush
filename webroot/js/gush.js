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
	numberEngines: 2 
};

(function($, $Config) {
	var searchTable = false,
		openRow = false,
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
			if (searchTable) searchTable.fnClearTable();
			resultsIndex = [];
			connectionManager.submitSearch($('#query').val(), searchResponse);
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

		function getAuthenticated() {
			return authenticated;
		}

		return {
			init: init,
			setLoadingCallback: setLoadingCallback,
			performLogin: performLogin,
			submitSearch: submitSearch,
			hasAuth: getAuthenticated,
			getMeta: getMetadata
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
			bPaginate: false,
			bFilter: false,
			bInfo: false,
			aaData: [],
			aoColumns: [{
				sTitle: 'Name',
				sWidth: '70%'
			}, {
				sTitle: 'Date',
				iDataSort: 6
			}, {
				sTitle: 'Size',
				sType: 'file-size'
			}, {
				sTitle: 'Seeds'
			}, {
				sTitle: 'Peers'
			}, {
				bVisible: false
			}, {
				bVisible: false
			}]
		};
		$.each(data, function (key, item) {
			var hash = item.hash.toUpperCase();
			if (typeof (resultsIndex[hash]) === 'undefined') {
				resultsIndex[hash] = item;
				resultsIndex[hash].metadata = [item.metadata];
				var maxLength = 50;
				var trimmedName = item.name.length > maxLength ? item.name.substring(0, (maxLength - 3)) + '...' : item.name.substring(0, maxLength);
				tableData.aaData.push([
					trimmedName,
					moment.unix(item.date).format('DD MMM YYYY HH:mm'),
					item.size,
					item.seeds,
					item.peers,
					hash,
					item.date
				]);
			} else {
				// add trackers to list
				var trackers = resultsIndex[hash].magnetParts.tr;
				resultsIndex[hash].magnetParts.tr = trackers.concat(item.magnetParts.tr);
				resultsIndex[hash].metadata.push(item.metadata);
				if(typeof (item.comments) !== 'undefined') resultsIndex[hash].comments = (resultsIndex[hash].comments + item.comments);
			}
		});
		initTable(tableData);
	}

	function initTable(tableData) {
		if (!searchTable) {
			searchTable = $('#results').dataTable(tableData);
		} else {
			searchTable.fnAddData(tableData.aaData);
		}
		sizeResultsArea();
		searchTable.fnSort([
			[3, 'desc']
		]);
		$('#results tbody tr').unbind('click');
		$('#results tbody tr').bind('click', function () {
			if (searchTable.fnIsOpen(this)) {
				searchTable.fnClose(this);
			} else {
				var info = searchTable.fnGetData(this)[5];
				searchTable.fnClose(openRow);
				searchTable.fnOpen(this, drawInfoRow(info), "info_row");
				openRow = this;
			}
		});
	}

	function drawInfoRow(hash) {
		var torrentData = resultsIndex[hash];
		var templateData = {};
		templateData.trackers = [];
		templateData.torrentName = torrentData.name;
		templateData.magnetLink = buildMagnetUri(torrentData);
		if (torrentData.comments) {
			templateData.comments = torrentData.comments;
		}
		
		$.each(torrentData.metadata, function (id, meta) {
			connectionManager.getMeta(meta.id, meta.name, receiveMetaData);
		});
		
		$.each(torrentData.magnetParts.tr, function(id, tracker) {
			templateData.trackers.push({trackerName: decodeURIComponent(tracker)});
		});
		return templateEngine.render('infoRow', templateData);
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
					commentList.comments.push({comment: $(this).html()});
				}
			});
			commentsPage.html(templateEngine.render('commentsPageContent', commentList));
			$('#comments-tab a').html('Comments (' + commentList.comments.length + ')');
		}
	}
	
	function inObject(needle, haystack) {
		for(var key in haystack) {
			if(haystack.hasOwnProperty(key) && key == needle) return true;
		}
		return false;
	}

	$(document).ready(init);
	
})(jQuery, settings);