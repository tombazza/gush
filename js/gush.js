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

$(document).ready(function () {
	
	$Gush = {
		searchTable: false,
		openRow: false,
		infoRow: false,
		resultsIndex: [],
		loading: 0,
		passcode: false,
		error: false,
		errorTypes: ['Generic', 'Data', 'Auth'],
		requests: [],
		init: function () {
			$('#query').keydown($Gush.submit);
			$('#query').focus($Gush.focus);
			$('#query').blur($Gush.blur);

			$Gush.infoRow = $('.info_content').clone();
		},
		focus: function(e) {
			if(!$Gush.passcode) {
				$(this).removeClass('passcode').val('').attr('type', 'password');
			}
		},
		blur: function(e) {
			if(!$Gush.passcode) {
				$(this).val('').attr('type', 'text').val('passcode?').addClass('passcode');
			}
		},
		submit: function (e) {
			if (e.which == 13) {
				if(!$Gush.passcode) {
					$Gush.passcode = $(this).val();
					$(this).addClass('loading');
					$.post('data.php', {a: 1, p: $Gush.passcode}, $Gush.parseResponse, "json");
				} else {
					$Gush.error = false;
					$('body').removeClass('error');
					if ($Gush.searchTable) $Gush.searchTable.fnClearTable();
					$Gush.resultsIndex = [];
					var query = $('#query').val();
					$('#query').addClass('loading');
					var url = 'data.php';
					for (i = 0; i < 3; i++) {
						$Gush.loading++;
						$Gush.requests.push($.post(url, {
							e: i,
							q: query,
							p: $Gush.passcode
						}, $Gush.parseResponse, "json"));
					}
				}
			}
		},
		terminateRequests: function() {
			$.each($Gush.requests, function(id, xhr) {
				xhr.abort();
			});
		},
		handleError: function (error) {
			var query = $('#query');
			console.log(error);
			$('body').removeClass('load').addClass('error');
			query.attr('type', 'text').val('Error: ' + error.message);
			$Gush.error = true;
			if(error.code == 2) {
				query.attr('disabled', 'disabled').blur();
				$Gush.terminateRequests();
				setTimeout(function() {window.location = window.location;}, 3000);
			} else {
				query.removeClass('loading');
			}
			
		},
		parseResponse: function (data) {
			if(!$Gush.error) {
				if(data.error) {
					$Gush.handleError(data.error);
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
									"file-size-pre": function ( a ) {
									    var x = a.substring(0,a.length - 2);
									    var x_unit = (a.substring(a.length - 2, a.length) == "MB" ? 1000 : (a.substring(a.length - 2, a.length) == "GB" ? 1000000 : 1));
									    return parseInt( x * x_unit, 10 );
									},
								    "file-size-asc": function ( a, b ) {return ((a < b) ? -1 : ((a > b) ? 1 : 0));},
								    "file-size-desc": function ( a, b ) {return ((a < b) ? 1 : ((a > b) ? -1 : 0));}
								});
							}
						}
					});
					return;
				}
				$Gush.loading--;
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
					if (typeof ($Gush.resultsIndex[hash]) === 'undefined') {
						$Gush.resultsIndex[hash] = item;
						$Gush.resultsIndex[hash].metadata = [item.metadata];
						tableData.aaData.push([
								item.name,
								item.size,
								item.seeds,
								item.peers,
								hash
						]);
					} else {
						// add trackers to list
						var trackers = $Gush.resultsIndex[hash].magnetParts.tr;
						$Gush.resultsIndex[hash].magnetParts.tr = trackers.concat(item.magnetParts.tr);
						$Gush.resultsIndex[hash].metadata.push(item.metadata); 
					}
				});
				if ($Gush.loading == 0) $('#query').removeClass('loading');
				$Gush.initTable(tableData);
			}
		},
		initTable: function (tableData) {
			if (!$Gush.searchTable) {
				$Gush.searchTable = $('#results').dataTable(tableData);
			} else {
				$Gush.searchTable.fnAddData(tableData.aaData);
			}
			$Gush.searchTable.fnSort([
				[2, 'desc']
			]);
			$('#results tbody tr').unbind('click');
			$('#results tbody tr').bind('click', function () {
				if ($Gush.searchTable.fnIsOpen(this)) {
					$Gush.searchTable.fnClose(this);
				} else {
					var info = $Gush.searchTable.fnGetData(this)[4];
					$Gush.searchTable.fnClose($Gush.openRow);
					$Gush.searchTable.fnOpen(this, $Gush.drawInfoRow(info), "info_row");
					$Gush.openRow = this;
				}
			});
		},
		drawInfoRow: function (hash) {
			var row = $Gush.resultsIndex[hash];
			console.log(row);
			var magnetURI = 'magnet:?xt=' + row.magnetParts.xt[0] + '&tr=' + row.magnetParts.tr.join('&tr=') + '&dn=' + row.magnetParts.dn[0];
			$Gush.infoRow.find('a.magnet').attr('href', magnetURI);
			return $Gush.infoRow;
		}
	};
	$Gush.init();
});
