Gush
====
Gush is an experimental torrent search engine that aggregates results from multiple different systems into one interface. It is designed to take search results from multiple torrent indexes, merge duplicate torrent's trackers and deliver everything asynchronously to a JavaScript powered interface.

#### DISCLAIMER:
This system **is not designed to aid copyright infringement**. It is designed purely as an experiment to test the retrieval of information from multiple differently constructed sources. Please be sensible and **do not** use this software for any illegal activities.

Included with this package are several data sources for third party websites. These files are intended as examples of how the system works and are not officially supported or endorsed by the websites they connect to. Their use may be against the terms of use of the websites they represent.

## Installation

Gush requires the following components to work correctly:

* Composer
* PHP 5.3+

To set up a copy of Gush, extract the source code to a directory and run:

`$ php composer.phar install`

Next create your password file and store it somewhere outside your web root. It should contain a plain-text password. Edit the `$passcode` variable in `data.php` to point to this text file.

Finally you should change the **Zend\Http\Client** adapter settings in `includes/Upstream.php` to point either to a proxy server or to use a different adapter.

## License
This code is released under the GNU General Public License, version 3 (GPL-3.0). Please see the file `LICENSE` for details.

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

[![GPLv3](http://www.gnu.org/graphics/gplv3-88x31.png "GPLv3")](http://www.gnu.org/licenses/gpl-3.0-standalone.html)

