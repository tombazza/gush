<!DOCTYPE html>
<!-- Gush | GPLv3 | http://git.io/gush -->
<html>
	<head>
		<title>Gush</title>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<link href='https://fonts.googleapis.com/css?family=Open+Sans' rel='stylesheet' type='text/css'>
		<link href="css/font-awesome.min.css" rel="stylesheet" type="text/css">
		<link href="css/normalize.css" rel="stylesheet" type="text/css">
		<link href="css/gush.css" rel="stylesheet" type="text/css">
		<link href="css/jquery.dataTables.css" rel="stylesheet" type="text/css">
		<link rel="icon" type="image/png" href="/images/favicon-32x32.png" sizes="32x32">
		<link rel="icon" type="image/png" href="/images/favicon-96x96.png" sizes="96x96">
		<link rel="icon" type="image/png" href="/images/favicon-16x16.png" sizes="16x16">
	</head>
	<body class="load">
		<div id="header">
			<h1>Gush</h1>
			<div id="search"><input type="password" id="query" name="query" placeholder="Enter password..."><div id="loading"></div></div>
			<div id="status"></div>
		</div>
		<table id="results"></table>
		<script type="text/mustache" id="infoRow">
		<div class="info_content">
			<ul class="tab-names">
				<li id="info-tab" class="selected"><a href="#"><i class="fa fa-info-circle"></i>Details</a></li>
				<li id="file-tab"><a href="#"><i class="fa fa-file"></i>File Listing</a></li>
				<li id="comments-tab"><a href="#"><i class="fa fa-comments"></i> Comments{{#commentsCount}} ({{commentsCount}}){{/commentsCount}}</a></li>
			</ul>
			<div id="info-page" class="tab-contents tab-shown">{{{infoPage}}}</div>
			<div id="file-page" class="tab-contents"></div>
			<div id="comments-page" class="tab-contents"></div>
		</div>
		</script>
		<script type="text/mustache" id="infoPageContent">
			<div class="title">
				<h2>{{torrentName}}</h2>
				<a href="{{magnetLink}}" class="magnet"><i class="fa fa-magnet fa-rotate-180"></i> Magnet Link</a>
			</div>
			<p><strong>Trackers{{#loadingTrackers}} (Loading...){{/loadingTrackers}}:</strong></p>
			<ul class="trackers">{{#trackers}}<li>{{trackerName}}</li>{{/trackers}}</ul>
		</script>
		<script type="text/mustache" id="filePageContent">
			<table><thead><tr><th>File</th><th>Size</th></tr></thead><tbody>
			{{#files}}<tr><td>{{filename}}</td><td>{{size}}</td>{{/files}}</tbody></table>
		</script>
		<script type="text/mustache" id="commentsPageContent">
			<p>Long comments are trimmed, click to show the entire comment.</p>
			{{#comments}}<div{{#commentRemainder}} class="expanded"{{/commentRemainder}}>{{commentStart}}{{#commentRemainder}}<span>{{commentRemainder}}</span>{{/commentRemainder}}</div>{{/comments}}
		</script>
		<script>
		window.gushSettings = {
			dataEndpoint: 'data.php',
			numberEngines: <?php 
				define('APP_LOCATION', dirname(getcwd()));
				require_once APP_LOCATION . '/includes/Config.php';
				GushConfig::Load(include APP_LOCATION . '/config.php');
				$config = GushConfig::getData();
				echo count($config['engines'])."\n";
			?>
		};
		</script>
		<script type="text/javascript" src="js/lib/jquery.min.js"></script>
		<script type="text/javascript" src="js/lib/jquery.dataTables.min.js"></script>
		<script type="text/javascript" src="js/lib/moment.min.js"></script>
		<script type="text/javascript" src="js/lib/mustache.min.js"></script>
		<script type="text/javascript" src="js/lib/progressbar.min.js"></script>
		<script type="text/javascript" src="js/gush.js"></script>
	</body>
</html>
