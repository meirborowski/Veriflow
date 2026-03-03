import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly s3Public: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const internalEndpoint =
      this.config.get<string>('MINIO_ENDPOINT') ?? 'http://localhost:9000';
    const publicEndpoint =
      this.config.get<string>('MINIO_PUBLIC_ENDPOINT') ?? internalEndpoint;
    const accessKeyId = this.config.get<string>('MINIO_ACCESS_KEY') ?? '';
    const secretAccessKey = this.config.get<string>('MINIO_SECRET_KEY') ?? '';

    this.bucket =
      this.config.get<string>('MINIO_BUCKET') ?? 'veriflow-attachments';

    const clientConfig = {
      region: 'us-east-1',
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    };

    this.s3 = new S3Client({ ...clientConfig, endpoint: internalEndpoint });
    this.s3Public = new S3Client({ ...clientConfig, endpoint: publicEndpoint });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" exists`);
    } catch {
      try {
        this.logger.log(`Creating bucket "${this.bucket}"...`);
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket "${this.bucket}" created`);
      } catch {
        this.logger.warn(
          `Could not connect to object storage — attachments will be unavailable until storage is online`,
        );
      }
    }
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getSignedDownloadUrl(key: string, expiresIn = 900): Promise<string> {
    return getSignedUrl(
      this.s3Public,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }
}
