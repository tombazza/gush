<?php 
use Zend\Dom\Query;
use Zend\Http\Client;
use Zend\Http\Request;

class DataUpstream {

	const FORMAT_JSON = 0;
	const FORMAT_XML = 1;
	const FORMAT_PLAIN = 2;

	const SORT_SIZE = 0;
	const SORT_SEEDS = 1;
	const SORT_LEECH = 2;
	const SORT_AGE = 3;

	const SORT_DESC = 0;
	const SORT_ASC = 1;

	protected function retreiveData($url, $format = self::FORMAT_PLAIN, $postData = false) {
		$curlOptions = array(
			CURLOPT_PROXY => 'localhost',
			CURLOPT_PROXYPORT => 8443,
			CURLOPT_FOLLOWLOCATION => true,
			CURLOPT_MAXREDIRS => 5,
			CURLOPT_TIMEOUT => 5
		);
		try {
			$config = array(
				'adapter'    => 'Zend\Http\Client\Adapter\Curl',
				'curloptions' => $curlOptions
			);
			$client = new Client($url, $config);
			$request = new Request();
			$request->setUri($url);
			$client->setRequest($request);
			if($postData) {
				$request->setMethod(Request::METHOD_POST);
				$request->setParameterPost($postData);
			}
			$client->setRequest($request);
			$response = $client->dispatch($request);
			if($response->getStatusCode() == 200) {
				switch($format) {
					case DataUpstream::FORMAT_JSON:
						return json_decode($response->getBody());
						break;
					case DataUpstream::FORMAT_XML:
						return simplexml_load_string($response->getBody());
					default:
						return $response->getBody();
						break;
				}
			} else {
				throw new Exception('Source returned code '.$response->getStatusCode());
			}
		} catch(Exception $e) {
			print_r($e);
			throw new GushException($e->getMessage(), GushException::Data);
			return false;
		}
	}

	protected function nodeToHTML($node) {
		$newdoc = new DOMDocument();
		$cloned = $node->cloneNode(TRUE);
		$newdoc->appendChild($newdoc->importNode($cloned,TRUE));
		$newHTML = $newdoc->saveHTML();

		return $newHTML;
	}

	protected function getTextBetweenTags($string, $tagname) {
		$pattern = "/<$tagname ?.*>(.*)<\/$tagname>/";
		preg_match($pattern, $string, $matches);
		return $matches[1];
	}

	protected function getAttributeFromHTML($string, $tag, $attr) {
		$dom = new DomDocument();
		$dom->loadHTML($string);

		$elements = $dom->getElementsByTagName($tag);

		for ($n = 0; $n < $elements->length; $n++) {
			$item = $elements->item($n);
			$href = $item->getAttribute($attr);
			return $href;
		}
	}

	protected function magnetToHash($magnetUrl) {
		$data = explode("&", $magnetUrl);
		return strtoupper(str_replace('magnet:?xt=urn:btih:', '', $data[0]));
	}
	
	protected function parseMagnetLink($magnetUrl) {
		$link = str_replace('magnet:?', '', $magnetUrl);
		$parts = explode('&', $link);
		$linkData = array();
		foreach($parts as $part) {
			list($key, $value) = explode("=", $part);
			$linkData[$key][] = $value;
		}
		return $linkData;
	}

	protected function formatBytes($bytes, $precision = 2) {
		$units = array('B', 'KB', 'MB', 'GB', 'TB');

		$bytes = max($bytes, 0);
		$pow = floor(($bytes ? log($bytes) : 0) / log(1024));
		$pow = min($pow, count($units) - 1);

		// Uncomment one of the following alternatives
		// $bytes /= pow(1024, $pow);
		$bytes /= (1 << (10 * $pow));

		return round($bytes, $precision) . ' ' . $units[$pow];
	}
	
	protected function cleanString($string) {
		$output = trim(str_replace(array("\r\n", "\n", "\t"), array(' ', ' ', ''), strip_tags($string)));
		return $output;
	}

}
