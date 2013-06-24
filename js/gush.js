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

var $Gush = function() {
	var searchTable = false,
		openRow = false,
		infoRow = false,
		resultsIndex = [],
		loading = 0,
		passcode = false,
		error = false,
		errorTypes = ['Generic', 'Data', 'Auth'],
		requests = [];
	
	function init() {
		$('#query').keydown(formSubmit);
		$('#query').focus(formFocus);
		$('#query').blur(formBlur);
		infoRow = $('.info_content').clone();
	}
	
	function formFocus(e) {
		if(!passcode) {
			$(this).removeClass('passcode').val('').attr('type', 'password');
		}
	}
	function formBlur(e) {
		if(!passcode) {
			$(this).val('').attr('type', 'text').val('passcode?').addClass('passcode');
		}
	}
	function formSubmit(e) {
		if (e.which == 13) {
			if(!passcode) {
				passcode = $(this).val();
				$(this).addClass('loading');
				$.post('data.php', {a: 1, p: passcode}, parseResponse, "json");
			} else {
				error = false;
				$('body').removeClass('error');
				if (searchTable) searchTable.fnClearTable();
				resultsIndex = [];
				var query = $('#query').val();
				$('#query').addClass('loading');
				var url = 'data.php';
				for (i = 0; i < 3; i++) {
					loading++;
					requests.push($.post(url, {
						e: i,
						q: query,
						p: passcode
					}, parseResponse, "json"));
				}
			}
		}
	}
	
	function terminateRequests() {
		$.each(requests, function(id, xhr) {
			xhr.abort();
		});
	}
	
	function handleError(error) {
		var query = $('#query');
		console.log(error);
		$('body').removeClass('load').addClass('error');
		query.attr('type', 'text').val('Error: ' + error.message);
		error = true;
		if(error.code == 2) {
			query.attr('disabled', 'disabled').blur();
			terminateRequests();
			setTimeout(function() {window.location = window.location;}, 3000);
		} else {
			query.removeClass('loading');
		}
		
	}
	function parseResponse(data) {
		if(!error) {
			if(data.error) {
				handleError(data.error);
				return;
			}
			
			if(data.auth) {
				$('body').removeClass('load');
				$('#query').removeClass('loading').attr('type', 'text').val('');
				yepnope({
					load: {
						'dtCss': '//cdnjs.cloudflare.com/ajax/libs/datatables/1.9.4/css/jquery.dataTables.css',
						'dtJs': '//cdnjs.cloudflare.com/ajax/libs/datatables/1.9.4/jquery.dataTables.min.js'
					},
					callback: {
						'dtJs': function(url, result, key) {
							jQuery.extend(jQuery.fn.dataTableExt.oSort, {
								"file-size-pre": function( a ) {
								    var x = a.substring(0,a.length - 2);
								    var x_unit = (a.substring(a.length - 2, a.length) == "MB" ? 1000 : (a.substring(a.length - 2, a.length) == "GB" ? 1000000 : 1));
								    return parseInt( x * x_unit, 10 );
								},
							    "file-size-asc": function( a, b ) {return ((a < b) ? -1 : ((a > b) ? 1 : 0));},
							    "file-size-desc": function( a, b ) {return ((a < b) ? 1 : ((a > b) ? -1 : 0));}
							});
						}
					}
				});
				return;
			}
			loading--;
			var tableData = {
				bPaginate: false,
				bFilter: false,
				bInfo: false,
				aaData: [],
				aoColumns: [
					{sTitle: 'Name', sWidth: '70%'},
					{sTitle: 'Size', sType: 'file-size'},
					{sTitle: 'Seeds'},
					{sTitle: 'Peers'}
				]
			};
			$.each(data, function (key, item) {
				var hash = item.hash.toUpperCase();
				if (typeof (resultsIndex[hash]) === 'undefined') {
					resultsIndex[hash] = item;
					resultsIndex[hash].metadata = [item.metadata];
					tableData.aaData.push([
							item.name,
							item.size,
							item.seeds,
							item.peers,
							hash
					]);
				} else {
					// add trackers to list
					var trackers = resultsIndex[hash].magnetParts.tr;
					resultsIndex[hash].magnetParts.tr = trackers.concat(item.magnetParts.tr);
					resultsIndex[hash].metadata.push(item.metadata); 
				}
			});
			if (loading == 0) $('#query').removeClass('loading');
			initTable(tableData);
		}
	}
	function initTable(tableData) {
		if (!searchTable) {
			searchTable = $('#results').dataTable(tableData);
		} else {
			searchTable.fnAddData(tableData.aaData);
		}
		searchTable.fnSort([
			[2, 'desc']
		]);
		$('#results tbody tr').unbind('click');
		$('#results tbody tr').bind('click', function () {
			if (searchTable.fnIsOpen(this)) {
				searchTable.fnClose(this);
			} else {
				var info = searchTable.fnGetData(this)[4];
				searchTable.fnClose(openRow);
				searchTable.fnOpen(this, drawInfoRow(info), "info_row");
				openRow = this;
			}
		});
	}
	function drawInfoRow(hash) {
		var row = resultsIndex[hash];
		console.log(row);
		var magnetURI = 'magnet:?xt=' + row.magnetParts.xt[0] + '&tr=' + row.magnetParts.tr.join('&tr=') + '&dn=' + row.magnetParts.dn[0];
		infoRow.find('a.magnet').attr('href', magnetURI);
		return infoRow;
	}

	var contract = {
		init: init
	};
	
	return contract;
}();


$(document).ready($Gush.init);
