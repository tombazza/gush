<?php

class Data_Isohunt extends DataUpstream {

	private $sortFields = array(
			self::SORT_SEEDS => 'seeds',
			self::SORT_LEECH => 'leechers',
			self::SORT_SIZE => 'size',
			self::SORT_AGE => 'time_add'
	);

	public function getData($query, $page = 1) {
		$url = $this->buildUrl($query, $page);
		$response = $this->retreiveData($url, self::FORMAT_JSON);
		if(!$response || $response->total_results == 0) return array();
		$data = array();
		foreach($response->items->list as $item) {
			$title = strip_tags((string) $item->title);
			$magnetLink = $this->buildMagnetLink($item->hash, $title, array(urlencode('udp://' . $item->tracker)));
			$data[] = array(
					'name' => $title,
					'magnet' => $magnetLink,
					'seeds' => (int) $item->Seeds,
					'peers' => (int) $item->leechers,
					'size' => (string) $item->size,
					'hash' => strtoupper((string) $item->hash),
					'magnetParts' => $this->parseMagnetLink($magnetLink),
					'comments' => $item->comments,
					'metadata' => array('Isohunt' => array('id' => $item->guid))
			);
		}
		return $data;
	}
	
	public function getTorrentMeta($torrentId) {
		$meta = array(
			'comments' => $this->getComments($torrentId),
			'files' => $this->getFileListing($torrentId)
		);
		return $meta;
	}
	
	private function getComments($torrentId) {
		$url = 'https://isohunt.com/torrent_details/'.$torrentId.'?tab=comments';
		$data = $this->retreiveData($url, self::FORMAT_PLAIN);
		$dom = new Zend_Dom_Query($data);
		$results = $dom->query('.commentBody1');
		$comments = array();
		foreach($results as $parentElement) {
			$newHTML = $this->nodeToHTML($parentElement);
			$comments[] = $this->cleanString($newHTML);
		}
		return $comments;
	}
	
	/**
	 * TODO: fix issue with single files in torrent
	 * @param unknown $torrentId
	 * @return multitype:multitype:NULL Ambigous <unknown>
	 */
	private function getFileListing($torrentId) {
		// #torrent_details tr
		$url = 'https://isohunt.com/torrent_details/'.$torrentId.'?tab=summary';
		$data = $this->retreiveData($url, self::FORMAT_PLAIN);
		$dom = new Zend_Dom_Query($data);
		$results = $dom->query('#torrent_details tr');
		$row = array();

		foreach($results as $parentElement) {
			$newHTML = $this->nodeToHTML($parentElement);
			$subDom = new Zend_Dom_Query($newHTML);
			$subResults = $subDom->query('td');
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
					'size' => $file[1]
			);
		}
		return $output;
	}
	
	private function buildUrl($query, $page, $sortField = self::SORT_SEEDS, $sortOrder = self::SORT_DESC) {
		$urlData['ihq'] = urlencode($query);
		$urlData['start'] = 0;
		$urlData['rows'] = 30;
		$urlData['sort'] = $this->sortFields[$sortField];
		$urlData['order'] = ($sortOrder ? 'asc' : 'desc');

		$url = 'https://ca.isohunt.com/js/json.php?' . http_build_query($urlData);
		return $url;
	}
	
	private function buildMagnetLink($hash, $name, $trackers) {
		$url = 'magnet:?xt=urn:btih:' . strtoupper($hash) . '&dn=' . urlencode($name) . '&tr=' . implode('&tr=', $trackers);
		return $url;
	}

}
