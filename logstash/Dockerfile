ARG ELK_VERSION

# https://www.docker.elastic.co/
FROM docker.elastic.co/logstash/logstash:${ELK_VERSION}

# ENV HTTP_PROXY="http://127.0.0.1:7890"	
# ENV HTTPS_PROXY="https://127.0.0.1:7890"	

# Add your logstash plugins setup here
# Example: RUN logstash-plugin install logstash-filter-json
RUN logstash-plugin install logstash-filter-sentimentalizer
