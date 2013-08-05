Gush
====
Gush is an experimental torrent search engine that aggregates results from multiple different systems into one interface. It is designed to take search results from multiple torrent indexes, merge duplicate torrent's trackers and deliver everything asynchronously to a JavaScript powered interface.

Gush is built using the following libraries and software:

* [PHP](http://www.php.net)
* [Zend Framework 2](http://framework.zend.com)
* [Composer](http://getcomposer.org/)
* [yepnope.js](http://yepnopejs.com/)
* [jQuery](http://www.jquery.com)
* [jQuery.DataTables](http://www.datatables.net/)
* [moment.js](http://momentjs.com/)

#### Disclaimer
**This software is not built to aid copyright infringement**. It is designed purely as an experiment into the retrieval of information from multiple different sources. Please **do not** use this software for any activity that may be illegal.

Included with Gush are several data sources for third party websites. These files are intended as examples of how the software works and are not officially supported or endorsed by the websites they connect to. As such, their use may be against the terms of service of the websites they represent.

## Installation

Gush requires the following components to work correctly:

* Composer
* PHP 5.3+

It is advisable to use a **[release](https://github.com/tombazza/gush/releases)** rather than the trunk which may have issues. To set up a copy of Gush, extract the source code to a directory and run:

`$ php composer.phar install`

#### Configuration

First create your password file and store it somewhere outside your web root. It should contain only a plain-text password.

Next, rename `config.php.dist` to `config.php`. You will need to edit this file to match your local settings.

* **passcode_file** (string) - path to the login passcode
* **adapter_settings** (array) - options to be passed to **Zend\Http\Client**
* **engines** (array) - list of content upstream engines found in `includes/Data`
* **show_errors** (boolean) - enable or disable showing of errors from PHP (does not silence exceptions)

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
