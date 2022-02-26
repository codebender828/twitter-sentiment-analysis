#!/bin/bash

python3 stream.py &
python3 spark.py && fg
# (trap 'kill 0' SIGINT; python3 stream.py & python3 spark.py)
# echo "RUNNING!"
