#!/usr/bin/env bash

# Build the Docker image using the Dockerfile.
docker build -t spotify-websocket .

# Bring up the container using docker compose.
docker compose up -d --remove-orphans --force-recreate
