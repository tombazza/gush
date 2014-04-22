## Gush

Gush is an experiment to give a simple interface for a complex problem: locating torrents across multiple different data sets. The data sets accessed could be disparate or the interfaces too cluttered and slow. Gush is the answer to this. 

Using a client based JavaScript approach, Gush connects to a backend API which provides data from upstream sources. The data is then returned and aggregated inside the client application.

#### Disclaimer
Some of the upstream modules included for Gush may access sites that are blocked in certain countries. This system is not designed to aid in access to any content that is copyrighted or illegal.

Further, the data sources that are included are left purely as examples of an upstream implementation. They are not officially supported or endorsed by the websites they connect to. As such, their use may be against the terms of service of the systems they represent.

### Uses

* [jQuery](http://jquery.org)
* [Moment.js](http://momentjs.com/)
* [mustache.js](https://github.com/janl/mustache.js)
* [DataTables](https://datatables.net/)

### Installation

Gush requires the following components to work correctly:

* Composer
* PHP 5.3+
* Node.JS

It is advisable to use a **[release](https://github.com/tombazza/gush/releases)** rather than the trunk which may have issues. To set up a copy of Gush, extract the source code to a directory and run:

`$ php composer.phar install`

Next, change to the `node` directory and install the node packages required:

`$ npm install`

To run the node service using nohup run `npm start` in the `node` directory, or use your favourite node daemonizing tool.

Finally, set your web server to point to the `webroot` directory to access the application.

#### Configuration

First create your password file and store it somewhere outside your web root. It should contain only a plain-text password.

Next, rename `config.php.dist` to `config.php`. You will need to edit this file to match your local settings.

* **passcode_file** (string) - path to the login passcode
* **adapter_settings** (array) - options to be passed to **Zend\Http\Client**
* **engines** (array) - list of content upstream engines found in `includes/Data`
* **show_errors** (boolean) - enable or disable showing of errors from PHP (does not silence exceptions)

### License
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
