<?php 

class ResultSet {
	
	private $matches = array();
	private $sortOrder = 'desc';
	private $sortField = 'seeds';
	
	public function addResults($results) {
		foreach($results as $key => $result) {
			$hash = strtolower($result['hash']);
			if(!array_key_exists($hash, $this->matches)) {
				$this->matches[$hash] = $result;
			} else {
				// found a duplicate link, get master (already set) and add current
				$trackers = $this->combineLinks($this->matches[$hash]['magnet'], $result['magnet']);
				$this->matches[$hash]['magnet'] = $this->buildMagnetLink($hash, $result['name'], $trackers);
			}
		}
	}
	
	function sortArray($a, $b) {
		if($this->sortOrder == 'asc') {
			return $a[$this->sortField] - $b[$this->sortField];
		} else {
			return $b[$this->sortField] - $a[$this->sortField];
		}
	}
	
	public function getResults() {
		usort($this->matches, array($this, 'sortArray'));
		return array_values($this->matches);
	}
	
	private function combineLinks($masterLink, $newLink) {
		$masterParts = $this->linkToTrackers($masterLink);
		$newParts = $this->linkToTrackers($newLink);
		foreach($newParts as $part) {
			if(array_search($part, $masterParts) === false) $masterParts[] = $part;
		}
		return $masterParts;
	}
	
	private function buildMagnetLink($hash, $name, $trackers) {
		$url = 'magnet:?xt=urn:btih:' . strtoupper($hash) . '&dn=' . urlencode($name) . '&tr=' . implode('&tr=', $trackers);
		return $url;
	}
	
	private function linkToTrackers($link) {
		$links = array();
		$parts = explode("&", $link);
		foreach($parts as $part) {
			if(substr($part, 0, 2) == 'tr') {
				$url = substr($part, 3);
				if(array_search($url, $links) === false) $links[] = substr($part, 3);
			}
		}
		return $links;
	}
}