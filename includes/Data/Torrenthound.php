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

class Data_Torrenthound extends DataUpstream {
	
	public function getData($query) {
		$url = 'http://localhost:9001/?engine=torrenthound&search=' . urlencode($query);
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
			if(!$item->name) continue;
			$magnetParts = $this->parseMagnetLink($item->magnet);
			$itemData = array();
			$itemData['name'] = $item->name;
			$itemData['magnet'] = $item->magnet;
			$itemData['seeds'] = (int) $item->seeds;
			$itemData['peers'] = (int) $item->peers;
			$itemData['size'] = $this->formatBytes($magnetParts['xl'][0]);
			$itemData['hash'] = strtoupper(str_replace('urn:btih:', '', $magnetParts['xt'][0]));
			$itemData['magnetParts'] = $magnetParts;
			$itemData['comments'] = $item->comments;
			$itemData['date'] = $item->date;
			$response[] = $itemData;
		}
		return $response;
	}
}