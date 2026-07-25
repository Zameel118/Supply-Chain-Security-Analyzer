FROM python:3.12-slim

WORKDIR /app

# curl is used by Docker healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Longer timeout + retries; upgrade pip first for more reliable downloads
ENV PIP_DEFAULT_TIMEOUT=180
RUN pip install --upgrade pip \
    && pip install --no-cache-dir --retries 10 -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
