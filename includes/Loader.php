<?php

/* 
 *
 * Gush - Aggregating torrent search engine
 * Copyright (C) 2014 tombazza
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

class GushLoader {
	
	private $config;
	
	public function __construct($config) {
		$this->config = $config;
		$this->passcode = trim(file_get_contents($config['passcode_file']));
	}
	
	public function run() {
		try {
			$this->checkAuth();
			$action = filter_input(INPUT_POST, 'a', FILTER_SANITIZE_STRING);
			if(!$action) {
				$action = 'auth';
			}
			$output = $this->handleAction($action);
			
		} catch (Exception $e) {
			$output = new GushOutput();
			$output->error = new stdClass();
			$output->error->code = $e->getCode();
			$output->error->message = $e->getMessage();
		}
		header('Content-type: application/json');
		echo json_encode($output);
		exit;
	}
	
	private function checkAuth() {
		$sentPasscode = filter_input(INPUT_POST, 'p', FILTER_SANITIZE_STRING);
		if($sentPasscode != $this->passcode) {
			throw new GushException('I don\'t know who you are.', GushException::Auth);
		}
	}
	
	private function handleAction($action) {
		if($action == 'auth') {
			$output = new GushOutput();
			$output->auth = 1;
			return $output;
		}
		
		if($this->config['cache']) {
			$cacheHash = sha1(json_encode($_POST));
			$cacheFile = APP_LOCATION . '/cache/' . $cacheHash;
			if(file_exists($cacheFile)) {
				return json_decode(file_get_contents($cacheFile));
			}
		}
		
		$engine = filter_input(INPUT_POST, 'e', FILTER_SANITIZE_STRING);
	
		switch($action) {
			case 'search':
				$engineObject = $this->loadEngine($engine);
				$query = filter_input(INPUT_POST, 'q', FILTER_SANITIZE_STRING);
				$output = $engineObject->getData($query);
				break;
			case 'metadata':
				$engineId = array_search($engine, $this->config['engines']);
				if($engineId !== false) {
					$engineObject = $this->loadEngine($engineId);
					$id = filter_input(INPUT_POST, 'i', FILTER_SANITIZE_STRING);
					$output = $engineObject->getTorrentMeta($id);
				}
				break;
			case 'trackers':
				require_once APP_LOCATION . '/includes/Data/Bitsnoop.php';
				$hash = filter_input(INPUT_POST, 'h', FILTER_SANITIZE_STRING);
				$engine = new Data_Bitsnoop();
				$output = $engine->getTrackers($hash);
				break;
		}
		
		if($this->config['cache']) {
			file_put_contents($cacheFile, json_encode($output));
		}
		
		return $output;
	}
	
	/**
	* Loads an engine resource and returns it
	* @param string $engineId
	* @return DataUpstream
	*/
   private function loadEngine($engineId) {
	   $engine = $this->config['engines'][$engineId];
	   $path = APP_LOCATION . '/includes/Data/' . basename($engine . '.php');
	   if(file_exists($path)) {
		   require_once $path;
		   $name = 'Data_' . $engine;
		   return new $name();
	   } else {
		   exit;
	   }
   }
	
}

class GushOutput {}