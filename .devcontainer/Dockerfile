FROM python:latest
WORKDIR /home/plakplaats

# Copy the files responsible for listing dependencies
COPY requirements.txt ./

# Cache the dependencies
RUN pip install -r requirements.txt --no-cache-dir

# Copy over everything
COPY . .

EXPOSE 3000
CMD ["python", "src/server.py"]
