FROM golang:1.21-alpine

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build the Go app
RUN go build -o server ./cmd/server

EXPOSE 3000

# Run the executable
CMD ["./server"]
