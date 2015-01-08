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

use Zend\Dom\Query;

class Data_Torrentz extends DataUpstream {

	public function getData($query, $page = 0) {
		$url = 'https://torrentz.eu/feed?q=' . urlencode($query);
		$data = $this->retreiveData($url, DataUpstream::FORMAT_XML);
		if(count($data->channel->item) > 0) {
			return $this->parseResponse($data->channel->item);
		} else {
			return array();
		}
	}

	private function parseResponse($data) {
		$response = array();
		foreach($data as $item) {
			$hash = str_replace('http://torrentz.eu/', '', (string) $item->link);
			$itemInfo = explode(' ', (string) $item->description);
			$itemData = array();
			$itemData['name'] = (string) $item->title;
			$itemData['magnet'] = 'magnet:?xt=urn:btih:'.$hash.'&dn='.urlencode($itemData['name']).'&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.ccc.de%3A80&tr=udp%3A%2F%2Ftracker.istole.it%3A80';
			$itemData['seeds'] = (int) str_replace(',', '', $itemInfo[4]);
			$itemData['peers'] = (int) $itemInfo[6];
			$itemData['size'] = $this->convertFileSize($itemInfo[1], $itemInfo[2]);
			$itemData['hash'] = $this->magnetToHash($itemData['magnet']);
			$itemData['magnetParts'] = $this->parseMagnetLink($itemData['magnet']);
			$itemData['comments'] = 0;
			$itemData['metadata'] = array('name' => 'Torrentz', 'id' => $itemData['hash']);
			$itemData['date'] = strtotime((string) $item->pubDate);
			$response[] = $itemData;
		}
		return $response;
	}
	
	public function getTorrentMeta($torrentId) {
		$meta = array(
			'comments' => array(),
			'files' => array()
		);
		return $meta;
	}
	
	private function convertFileSize($size, $format) {
		$fileSize = $size;
		$itemSize = 0;
		switch(strtolower($format)) {
			case 'kb':
				$itemSize = (float) substr($fileSize, 0, (strlen($fileSize - 3))) * 1024;
				break;
			case 'mb':
				$itemSize = ((float) substr($fileSize, 0, (strlen($fileSize - 3))) * (1024 * 1024));
				break;
			case 'gb':
				$size = (float) substr($fileSize, 0, (strlen($fileSize - 3)));
				$itemSize = $size * (1024 * (1024 * 1024));
				break;
		}
		return $this->formatBytes($itemSize);
	}
}
