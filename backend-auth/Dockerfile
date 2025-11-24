# Multi-stage build
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod ./

# Download dependencies and generate go.sum
RUN go mod download

# Copy source code
COPY . .

# Ensure go.sum is created
RUN go mod tidy

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o auth-service ./cmd/api

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary from builder
COPY --from=builder /app/auth-service .

# Copy .env if needed
COPY .env.example .env

EXPOSE 8080

CMD ["./auth-service"]
