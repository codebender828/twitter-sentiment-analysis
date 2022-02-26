ARG IMAGE_VARIANT=slim-buster
ARG OPENJDK_VERSION=8
ARG PYTHON_VERSION=3.9.8

FROM python:${PYTHON_VERSION}-${IMAGE_VARIANT} AS py3
FROM openjdk:${OPENJDK_VERSION}-${IMAGE_VARIANT}


LABEL maintainer="Jonathan Bakebwa"

RUN apt update && \
  apt install -y build-essential libpcap-dev libpq-dev libssl-dev libffi-dev \
  python3-dev cargo

RUN cargo --version

COPY --from=py3 / /

EXPOSE 9009

COPY spark ./app

WORKDIR /app

ARG PYSPARK_VERSION=3.2.0
RUN pip --no-cache-dir install pyspark==${PYSPARK_VERSION}

RUN pip install -r requirements.txt

RUN chmod u+x ./run.sh
ENTRYPOINT ["./run.sh"]
