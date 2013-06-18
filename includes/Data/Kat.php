<?php

class Data_Kat extends DataUpstream {

	private $sortFields = array(
			self::SORT_SEEDS => 'seeders',
			self::SORT_LEECH => 'leechers',
			self::SORT_SIZE => 'size',
			self::SORT_AGE => 'time_add'
	);

	public function getData($query, $page = 1) {
		$url = $this->buildUrl($query, $page);
		try {
			// Response causes a 404, which triggers an exception
			$response = $this->retreiveData($url, self::FORMAT_XML);
		} catch (GushException $e) {
			return array();
		}
		$data = array();
		foreach($response->channel->item as $item) {
			$namespaces = $item->getNameSpaces(true);
			$torrent = $item->children($namespaces['torrent']);
			$data[] = array(
				'name' => (string) $item->title,
				'magnet' => urldecode((string) $torrent->magnetURI),
				'seeds' => (int) $torrent->seeds,
				'peers' => (int) $torrent->peers,
				'size' => $this->formatBytes((string) $torrent->contentLength),
				'hash' => (string) $torrent->infoHash,
				'magnetParts' => $this->parseMagnetLink($torrent->magnetURI),
				'metadata' => array('Kat' => array('id' => str_replace(array('http://kat.ph/', '.html'), '', $item->link)))
			);
		}
		return $data;
	}
	
	// files: #torrent_files tr
	
	public function getTorrentMeta($torrentId) {
		$url = 'http://kat.ph/'.$torrentId.'.html';
		$data = $this->retreiveData($url, self::FORMAT_PLAIN);
		$meta = array(
			'comments' => $this->getComments($data),
			'files' => $this->getFileListing($data)
		);
		return $meta;
	}
	
	private function getComments($data) {
		$dom = new Zend_Dom_Query($data);
		$results = $dom->query('.commentText');
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
	private function getFileListing($data) {
		$dom = new Zend_Dom_Query($data);
		$results = $dom->query('#torrent_files tr');
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
					'filename' => $file[2],
					'size' => $this->cleanString($file[3] . ' ' . $file[4])
			);
		}
		return $output;
	}

	private function buildUrl($query, $page, $sortField = self::SORT_SEEDS, $sortOrder = self::SORT_DESC) {
		$urlData['rss'] = 1;
		$urlData['field'] = $this->sortFields[$sortField];
		$urlData['sorder'] = ($sortOrder ? 'asc' : 'desc');

		$url = 'http://kat.ph/usearch/' . urlencode($query) . '/' . $page . '/?' . http_build_query($urlData);
		return $url;
	}

}
