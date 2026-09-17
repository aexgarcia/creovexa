FROM golang:1.25-alpine AS builder
RUN apk add --no-cache git ca-certificates
ENV CGO_ENABLED=0
RUN go install github.com/minio/minio@RELEASE.2025-10-15T17-29-55Z

FROM alpine:3.23
RUN apk add --no-cache ca-certificates curl tzdata \
    && addgroup -S minio \
    && adduser -S -G minio minio \
    && mkdir /data \
    && chown minio:minio /data
COPY --from=builder /go/bin/minio /usr/local/bin/minio
USER minio
EXPOSE 9000 9001
ENTRYPOINT ["minio"]
CMD ["server", "/data", "--console-address", ":9001"]
