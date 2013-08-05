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

    public function getData($query, $page = 0) {
        $url = $this->buildUrl($query, $page);
        $response = $this->retreiveData($url, self::FORMAT_PLAIN);
        if(strpos($response, 'No hits.') > 0) return array();
        return $this->parseResponse($response);
    }

    private function parseResponse($html) {
        $dom = new Query($html);
        $results = $dom->execute('tr');

        $i = 0;
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
            if(count($parts) && $i) $row[] = $parts;
            $i++;
        }

        $data = array();
        foreach($row as $item) {
            $infoLinkParts = explode('/', $this->getAttributeFromHTML($item[1], 'a', 'href'));
            $totalFields = count($item);
            $itemData = array();
            $itemData['name'] = $this->getTextBetweenTags($item[1], 'a');
            $itemData['magnet'] = $this->getAttributeFromHTML($item[2], 'a', 'href');
            $itemData['seeds'] = (int) $item[($totalFields - 2)];
            $itemData['peers'] = (int) $item[($totalFields - 1)];
            $sizeParts = explode(',', $item[($totalFields - 3)]);
            $itemData['size'] = $this->convertFileSize($sizeParts[1]);
            
            $itemData['hash'] = $this->magnetToHash($itemData['magnet']);
            $itemData['magnetParts'] = $this->parseMagnetLink($itemData['magnet']);
            if(stripos($item[3], 'comment')) {
                $itemData['comments'] = preg_replace("/[^0-9]/","", $this->getAttributeFromHTML($item[3], 'img', 'alt'));
            }
            $itemData['metadata'] = array('name' => 'Piratebay', 'id' => $infoLinkParts[2]);
            
            $dateOutput = 0;
            foreach($item as $rowId => $possibleDateRow) {
                if(stripos($possibleDateRow, 'Uploaded')) {
                    $dateOutput = $this->parseDateRow($item[$rowId]);
                    break;
                }
            }
            $itemData['date'] = $dateOutput;
            $data[] = $itemData;
        }
        return $data;
    }
    
    private function parseDateRow($dateRow) {
        $dateParts = explode(',', $dateRow);
        $recordDate = str_replace(array('<font class="detDesc">Uploaded ', '&nbsp;'), array('', '-'), $dateParts[0]);
        $finalDateParts = explode('-', $recordDate);
        $dateOutput = 0;
        if(stripos($recordDate, ':')) {
            // without year means this year
            if($finalDateParts[0] != 'Today') {
                $timeParts = explode(':', $finalDateParts[2]);
                $dateOutput = mktime($timeParts[0],$timeParts[1],0,$finalDateParts[0], $finalDateParts[1], date('y'));
            } else {
                $timeParts = explode(':', $finalDateParts[1]);
                $dateOutput = mktime($timeParts[0],$timeParts[1],0,date('m'), date('d'), date('Y'));
            }
        } else {
            // previous year
            $dateOutput = mktime(0,0,0,$finalDateParts[0], $finalDateParts[1], $finalDateParts[2]);
        }
        return $dateOutput;
    }
    
    public function getTorrentMeta($torrentId) {
        $meta = array(
            'comments' => $this->getComments($torrentId),
            'files' => $this->getFileListing($torrentId)
        );
        return $meta;
    }
    
    private function getComments($torrentId) {
        $url = 'http://thepiratebay.sx/ajax_details_comments.php';
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
        $url = 'http://thepiratebay.sx/ajax_details_filelist.php?id='. $torrentId;
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
        $url = 'http://thepiratebay.sx/search/' . urlencode($query) . '/' . $page . '/' . $sortValue;
        return $url;
    }
}
