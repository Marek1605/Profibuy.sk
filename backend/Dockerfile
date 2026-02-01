FROM golang:1.21-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod ./

RUN go mod download 2>&1 || true

COPY . .

# Verbose build to see errors
RUN go mod tidy 2>&1 && \
    CGO_ENABLED=0 GOOS=linux go build -v -o server ./cmd/server 2>&1

FROM alpine:latest

RUN apk --no-cache add ca-certificates wget

WORKDIR /app

COPY --from=builder /app/server .
COPY --from=builder /app/migrations ./migrations

EXPOSE 8080

CMD ["./server"]
