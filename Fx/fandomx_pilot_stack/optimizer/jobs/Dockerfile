FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -U pip && pip install --no-cache-dir -r requirements.txt
COPY jobs ./jobs
COPY service ./service
CMD ["python", "jobs/stream_consumer.py"]
