<?php
http_response_code(403);
header('HTTP/1.1 403 Forbidden');
die('<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body><h1>403 Forbidden</h1><p>Access to this directory is restricted.</p></body></html>');
