#!/usr/bin/env bash
set -euo pipefail

# Some Linux desktop sessions export DEBUG, which Spring Boot treats as
# "enable debug logs". Unset it for a quiet development server.
unset DEBUG

java -jar target/gestion-municipale-spring-1.0.0.jar
