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

class Data_Piratebay extends DataUpstream {

	private $sortFields = array(
			self::SORT_SEEDS => 7,
			self::SORT_LEECH => 9,
			self::SORT_SIZE => 5,
			self::SORT_AGE => 3
	);
	
	private $domain = 'thepiratebay.se';

	public function getData($query) {
		$url = $this->buildUrl($query);
		$data = $this->retreiveData($url);
		if(count($data) > 0) {
			return $this->parseResponse($data);
		} else {
			return array();
		}
	}

	private function parseResponse($data) {
		$document = new Query($data);
		$records = $document->execute('#searchResult tr');
		$output = array();
		foreach($records as $row) {
			if($row->hasAttribute('class') && $row->getAttribute('class') != 'header') {
				$itemData = array();
				$rowHTML = $this->nodeToHTML($row);
				$rowDoc = new Query($rowHTML);
				
				// start doing lookups
				$link = $rowDoc->execute('a[href*="magnet"]');
				$name = $rowDoc->execute('a.detLink');
				$seeds_peers = $rowDoc->execute('td[align="right"]');
				$dataArea = $rowDoc->execute('font.detDesc');
				
				// Get file size, uploaded time
				$dataParts = explode(",", $dataArea[0]->nodeValue);
				
				// ID from link
				$detLink = explode("/", $name[0]->getAttribute('href'));
				
				$itemData['name'] = $name[0]->nodeValue;
				$itemData['magnet'] = $link[0]->getAttribute('href');
				$itemData['seeds'] = $seeds_peers[0]->nodeValue;
				$itemData['peers'] = $seeds_peers[1]->nodeValue;
				$itemData['size'] = $this->sizeFromData($dataParts);
				$itemData['hash'] = $this->magnetToHash($itemData['magnet']);
				$itemData['magnetParts'] = $this->parseMagnetLink($itemData['magnet']);
				$itemData['comments'] = 0;
				$itemData['metadata'] = array('name' => 'Piratebay', 'id' => $detLink[2]);
				$itemData['date'] = $this->dateFromData($dataParts);
				
				$output[] = $itemData;
			}
		}
		return $output;
	}
	
	private function sizeFromData($data) {
		return $this->convertFileSize($data[1]);
	}
	
	private function dateFromData($data) {
		$dateParsed = trim(str_replace('Uploaded', '', $data[0]));
		$date = explode(chr(194).chr(160), $dateParsed);
		$timeParts = explode(":", $date[1]);
		$output = '';
		if($date[0] == 'Today') {
			$output = mktime($timeParts[0], $timeParts[1]);
		} elseif($date[0] == 'Y-day') {
			$output = mktime($timeParts[0], $timeParts[1]) - 86400;
		} else {
			$dateParts = explode("-", $date[0]);
			if(strpos($date[1], ':') !== false) {
				// Date is this year, but with a time
				$output = mktime($timeParts[0], $timeParts[1], 0, $dateParts[0], $dateParts[1], date('Y'));
			} else {
				// Date has a year specified, no time
				$output = mktime(15, 0, 0, $dateParts[0], $dateParts[1], $date[1]);
			}
		}
		return $output;
	}
	
	public function getTorrentMeta($torrentId) {
		$meta = array(
			'comments' => $this->getComments($torrentId),
			'files' => $this->getFileListing($torrentId)
		);
		return $meta;
	}
	
	private function getComments($torrentId) {
		$url = 'https://'.$this->domain.'/ajax_details_comments.php';
		$post = array(
			'id' => $torrentId,
			'page' => '1'
		);
		$data = $this->retreiveData($url, self::FORMAT_PLAIN, $post);
		$comments = array();
		if(trim($data)) {
			$dom = new Query($data);
			$results = $dom->execute('div[id*="comment"] .comment');
			foreach($results as $parentElement) {
				$newHTML = $this->nodeToHTML($parentElement);
				$comments[] = $this->cleanString($newHTML);
			}
		}
		return $comments;
	}
	
	private function getFileListing($torrentId) {
		$url = 'https://'.$this->domain.'/ajax_details_filelist.php?id='. $torrentId;
		$data = $this->retreiveData($url, self::FORMAT_PLAIN);
		$dom = new Query($data);
		$results = $dom->execute('tr');
		$row = array();

		foreach($results as $parentElement) {
			$newHTML = $this->nodeToHTML($parentElement);
			$subDom = new Query($newHTML);
			$subResults = $subDom->execute('td');
			$parts = array();
			foreach($subResults as $subResult) {
				foreach($subResult->childNodes as $childNode) {
					$tmpHTML = str_replace(array("\t", "\n"), '', trim($this->nodeToHTML($childNode)));
					if($tmpHTML || $tmpHTML === '0') $parts[] = $tmpHTML;
				}
			}
			if(count($parts)) $row[] = $parts;
		}

		$output = array();
		foreach($row as $file) {
			$output[] = array(
				'filename' => $file[0],
				'size' => $this->convertFileSize($file[1])
			);
		}
		return $output;
	}
	
	private function convertFileSize($size) {
		$fileSize = str_replace(array('Size ', '&nbsp;'), '', trim($size));
		$itemSize = 0;
		switch(strtolower(substr($fileSize, -3))) {
			case 'kib':
				$itemSize = (float) substr($fileSize, 0, (strlen($fileSize - 3))) * 1024;
				break;
			case 'mib':
				$itemSize = ((float) substr($fileSize, 0, (strlen($fileSize - 3))) * (1024 * 1024));
				break;
			case 'gib':
				$size = (float) substr($fileSize, 0, (strlen($fileSize - 3)));
				$itemSize = $size * (1024 * (1024 * 1024));
				break;
		}
		return $this->formatBytes($itemSize);
	}

	private function buildUrl($query, $page = 0, $sortField = self::SORT_SEEDS, $sortOrder = self::SORT_DESC) {
		$sortValue = ($this->sortFields[$sortField] + $sortOrder);
		$url = 'https://'.$this->domain.'/search/' . urlencode($query) . '/' . $page . '/' . $sortValue;
		return $url;
	}
}
