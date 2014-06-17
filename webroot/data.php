<?php 
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

define('APP_LOCATION', dirname(getcwd()));

require_once APP_LOCATION . '/vendor/autoload.php';
require_once APP_LOCATION . '/includes/Upstream.php';
require_once APP_LOCATION . '/includes/Config.php';
require_once APP_LOCATION . '/includes/Exception.php';
require_once APP_LOCATION . '/includes/Loader.php';

GushConfig::Load(include APP_LOCATION . '/config.php');
$config = GushConfig::getData();

if($config['show_errors']) {
	ini_set('display_errors', 'on');
	error_reporting(E_ALL);
} else {
	ini_set('display_errors', 'off');
	error_reporting(0);
}

$loader = new GushLoader($config);
$loader->run();