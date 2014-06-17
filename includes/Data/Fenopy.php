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

class Data_Fenopy extends DataUpstream {
	
	public function getData($query) {
		$url = 'http://localhost:9001/?engine=fenopy&search=' . urlencode($query);
		$data = $this->getLocalResponse($url);
		if(count($data) > 0) {
			return $this->parseResponse($data);
		} else {
			return array();
		}
	}
	
	private function parseResponse($data) {
		$response = array();
		foreach($data as $item) {
			$itemData = array();
			$itemData['name'] = $item->name;
			$itemData['magnet'] = $item->magnet;
			$itemData['seeds'] = (int) $item->seeds;
			$itemData['peers'] = (int) $item->peers;
			$itemData['size'] = $item->size;
			$itemData['hash'] = $this->magnetToHash($itemData['magnet']);
			$itemData['magnetParts'] = $this->parseMagnetLink($itemData['magnet']);
			$itemData['comments'] = $item->comments;
			$itemData['date'] = $item->date;
			$response[] = $itemData;
		}
		return $response;
	}
}