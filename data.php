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
require_once 'includes/Config.php';

GushConfig::Load(include 'config.php');
$config = GushConfig::getData();
define('APP_LOCATION', getcwd());
$passcode = trim(file_get_contents($config['passcode_file']));


class GushException extends Exception {
    const Auth = 2;
    const Data = 1;
    const Generic = 0;
    
    public function __construct($message, $code = GushException::Generic) {
        parent::__construct($message, $code);
    }
}

class GushOutput {}

function clean($string) {
    $string = preg_replace('/[^a-z0-9 -_\(\)]/i', '', $string);
    return trim(strip_tags($string));
}

/**
 * Loads an engine resource and returns it
 * @param string $engine
 * @return DataUpstream
 */
function loadEngine($engine) {
    $path = APP_LOCATION . '/includes/Data/' . basename($engine . '.php');
    if(file_exists($path)) {
        require_once $path;
        $name = 'Data_' . $engine;
        return new $name();
    } else exit;
}


try {
    if(!array_key_exists('p', $_POST) || $_POST['p'] != $passcode) {
        throw new GushException('I don\'t know who you are.', GushException::Auth);
    }
    
    $action = 'auth';
    if(array_key_exists('a', $_POST)) $action = $_POST['a'];
    
    switch($action) {
        case 'search':
            $query = $_POST['q'];
            $engine = $config['engines'][$_POST['e']];
            $data = loadEngine($engine);
            $output = $data->getData($query);
            break;
        case 'metadata':
            $engineId = array_search(clean($_POST['e']), $config['engines']);
            if($engineId !== false) {
                $engine = $config['engines'][$engineId];
                $data = loadEngine($engine);
                $output = $data->getTorrentMeta($_POST['i']);
            }
            break;
        default:
            $output = new stdClass();
            $output->auth = 1;
            break;
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
