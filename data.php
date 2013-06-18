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

ini_set('display_errors', 'on');
error_reporting(E_ALL);

require_once 'vendor/autoload.php';
require_once 'includes/Upstream.php';

$passcode = trim(file_get_contents('/var/sites/gush.passcode.txt'));


class GushException extends Exception {
	const Auth = 2;
	const Data = 1;
	const Generic = 0;
	
	public function __construct($message, $code = GushException::Generic) {
		parent::__construct($message, $code);
	}
}

class GushOutput {}

try {
	if(!array_key_exists('p', $_POST) || $_POST['p'] != $passcode) {
		throw new GushException('I don\'t know who you are.', GushException::Auth);
	}
	
	if(array_key_exists('a', $_POST)) {
		$output = new stdClass();
		$output->auth = 1;
	} else {
		$query = $_POST['q'];
		$engines = array('Piratebay', 'Kat', 'Isohunt');
		$engine = $engines[$_POST['e']];
		
		require_once 'includes/Data/' . $engine . '.php';
		
		$name = 'Data_' . $engine;
		$data = new $name();
		$output = $data->getData($query);
	}
} catch (Exception $e) {
	$output = new GushOutput();
	$output->error = new stdClass();
	$output->error->code = $e->getCode();
	$output->error->message = $e->getMessage();
}

header('Content-type: application/json');
echo json_encode($output);
exit;
