FROM python:3.11-slim
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir -U pip && pip install --no-cache-dir fastapi uvicorn pydantic requests
COPY app ./app
EXPOSE 8002
CMD ["uvicorn","app.api:app","--host","0.0.0.0","--port","8002"]
