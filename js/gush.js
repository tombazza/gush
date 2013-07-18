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

var $Gush = function ($, $Config) {
    var searchTable = false,
        openRow = false,
        infoRow = false,
        resultsIndex = [],
        loading = 0,
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
        if (!connectionManager.hasAuth()) {
            $(this).removeClass('passcode').val('').attr('type', 'password');
        }
    }

    function formBlur(e) {
        if (!connectionManager.hasAuth()) {
            $(this).val('').attr('type', 'text').val('passcode?').addClass('passcode');
        }
    }

    function formSubmit(e) {
        if (e.which == 13) {
            if (!connectionManager.hasAuth()) {
                $(this).addClass('loading');
                connectionManager.performLogin($(this).val(), postAuth);
            } else {
                performSearch();

            }
        }
    }

    function performSearch() {
        error = false;
        $('body').removeClass('error');
        if (searchTable) searchTable.fnClearTable();
        resultsIndex = [];
        var query = $('#query').val();
        $('#query').addClass('loading');
        connectionManager.submitSearch(query, searchResponse);
    }

    var connectionManager = function () {
        var requests = [],
            passcode = '',
            authenticated = false;

        function performLogin(code, callback) {
            passcode = $.trim(code);
            loadData({
                a: 'auth',
                p: passcode
            }, function (data) {
                handleAuthResponse(data, callback);
            });
        }

        function submitSearch(query, callback) {
            for (i = 0; i < $Config.numberEngines; i++) {
                loadData({
                    a: 'search',
                    e: i,
                    q: query,
                    p: passcode
                }, callback);
            }
        }

        function getMetadata(id, engine, callback) {
            loadData({
                a: 'metadata',
                e: engine,
                i: id,
                p: passcode
            }, callback);
        }

        function loadData(post, callback) {
            var requestId = requests.length + 1;
            requests[requestId] = $.ajax({
                type: "POST",
                url: $Config.dataEndpoint,
                data: post,
                dataType: 'json',
                success: function (data) {
                    deleteRequest(requestId);
                    if (checkErrorState(data)) callback(data);
                },
                error: function (xhr, status, error) {
                    deleteRequest(requestId);
                    displayError({
                        message: 'Request failed',
                        code: 1
                    });
                }
            });
        }

        function deleteRequest(requestId) {
            var position = $.inArray(requestId, requests);
            if (~position) requests.splice(position, 1);
        }

        function checkErrorState(data) {
            if (data.error) {
                displayError(data.error);
                return false;
            }
            return true;
        }

        function handleAuthResponse(data, callback) {
            if (data.auth) {
                authenticated = true;
                callback();
            }
        }

        function terminateRequests() {
            $.each(requests, function (id, xhr) {
                if (xhr) xhr.abort();
            });
        }

        function getAuthenticated() {
            return authenticated;
        }

        return {
            performLogin: performLogin,
            submitSearch: submitSearch,
            stopAll: terminateRequests,
            getMeta: getMetadata,
            hasAuth: getAuthenticated
        };
    }();



    /**
     * Executed in the event of a successful authentication
     * @returns null
     */

    function postAuth() {
        $('body').removeClass('load');
        $('#query').removeClass('loading').attr('type', 'text').val('');
        yepnope({
            load: {
                'dtCss': '//cdnjs.cloudflare.com/ajax/libs/datatables/1.9.4/css/jquery.dataTables.css',
                'dtJs': '//cdnjs.cloudflare.com/ajax/libs/datatables/1.9.4/jquery.dataTables.min.js'
            },
            callback: {
                'dtJs': function (url, result, key) {
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
            }
        });
    }

    function displayError(response) {
        var query = $('#query');
        console.log(response);
        $('body').removeClass('load').addClass('error');
        query.attr('type', 'text').val('Error: ' + response.message);

        if (response.code == 2) {
            query.attr('disabled', 'disabled').blur();
            connectionManager.stopAll();
            setTimeout(function () {
                window.location = window.location;
            }, 3000);
        } else {
            query.removeClass('loading');
        }
        error = true;

    }

    function searchResponse(data) {
        console.log(data);
        loading--;
        var tableData = {
            bPaginate: false,
            bFilter: false,
            bInfo: false,
            aaData: [],
            aoColumns: [{
                sTitle: 'Name',
                sWidth: '70%'
            }, {
                sTitle: 'Size',
                sType: 'file-size'
            }, {
                sTitle: 'Seeds'
            }, {
                sTitle: 'Peers'
            }]
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

        var commentsText = 'Comments';
        if (row.comments) {
            commentsText = 'Comments (' + row.comments + ')';
        }
        infoRow.find('#comments-tab a').html(commentsText);

        infoRow.find('#file-page table tbody').html('');
        infoRow.find('#comments-page').html('');

        infoRow.find('li a').click(function (e) {
            e.preventDefault();
            infoRow.find('li').removeClass('selected');
            $(this).parent().addClass('selected');
            var id = $(this).parent().attr('id').replace('-tab', '');
            infoRow.find('.tab-contents').hide();
            infoRow.find('#' + id + '-page').show();
        });
        $.each(row.metadata, function (id, meta) {
            connectionManager.getMeta(meta.id, meta.name, receiveMetaData);
        });

        return infoRow;
    }

    function receiveMetaData(data) {
        console.log(data);
        if (data.files.length) {
            filesPage = infoRow.find('#file-page table tbody');
            var fileList = '';
            if (filesPage.html() == '') {
                $.each(data.files, function (id, value) {
                    fileList += '<tr><td>' + value.filename + '</td><td>' + value.size + '</td></tr>';
                });
                infoRow.find('#file-page table tbody').html(fileList);
            }
        }
        if (data.comments) {
            commentsPage = infoRow.find('#comments-page');
            commentCount = infoRow.find('#comments-tab a').html().match(/\d+\.?\d*/g);
            console.log(commentCount);
            if (!commentCount) commentCount = 0;
            var commentsHtml = commentsPage.html();
            for (i = 0; i < data.comments.length; i++) {
                comment = $.trim(data.comments[i]);
                if (comment) {
                    commentsHtml += '<div>' + comment + '</div>';
                    commentCount++;
                }
            }
            commentsPage.html(commentsHtml);
            infoRow.find('#comments-tab a').html('Comments (' + commentCount + ')');
        }
    }

    var contract = {
        init: init
    };

    return contract;
}(jQuery, settings);


$(document).ready($Gush.init);
