<?php

return array(
    'passcode_file' => '../gush.passcode.txt',
    'adapter_settings' => array(
        'adapter'    => 'Zend\Http\Client\Adapter\Curl',
        'curloptions' => array(
            CURLOPT_PROXY => 'localhost',
            CURLOPT_PROXYPORT => 8443,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
            CURLOPT_TIMEOUT => 5
        )
    ),
    'engines' => array('Piratebay', 'Kat', 'Isohunt')
);
