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

class Data_Bitsnoop extends DataUpstream {
	
	public function getTrackers($hash) {
		$url = 'https://bitsnoop.com/api/trackers.php?hash=' . $hash . '&json=1';
		$data = $this->retreiveData($url, self::FORMAT_JSON);
		if($data == 'NOTFOUND' || $data == 'ERROR') {
			return array();
		} else {
			foreach($data as $key => $row) {
				if($row->NUM_SEEDERS > 0) {
					$updated[$key] = $row->UPDATED;
					$seeds[$key] = $row->NUM_SEEDERS;
				} else {
					unset($data[$key]);
				}
			}
			array_multisort($seeds, SORT_DESC, $updated, SORT_DESC, $data);
			$output = array();
			foreach($data as $tracker) {
				$output[] = $tracker->ANNOUNCE;
			}
			return array_slice($output, 0, 20);
		}
	}

}
