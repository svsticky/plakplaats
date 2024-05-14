FROM python:alpine
WORKDIR /home/plakplaats

# Copy the files responsible for listing dependencies
COPY requirements.txt ./

# Cache the dependencies
RUN apk add --no-cache postgresql-libs && \
	apk add --no-cache --virtual .build-deps gcc musl-dev postgresql-dev
RUN python3 -m pip install -r requirements.txt --no-cache-dir
RUN apk --purge del .build-deps

# Copy the source code
COPY src src

EXPOSE 3000
CMD ["python", "src/server.py"]
