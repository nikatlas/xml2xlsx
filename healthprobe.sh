#!/bin/bash

# Perform HTTP request
response=$(curl --write-out '%{http_code}' --silent --output /dev/null https://converter.pluginverse.com)

# Check if response is not 200
if [ $response -ne 200 ]; then
    # Navigate to specific directory
    cd /var/www/vhosts/pluginverse.com/converter.pluginverse.com

    # Run docker-compose up
	echo "Service is down, restarting..."
	docker-compose up -d
else
	echo "Service is up"
fi
