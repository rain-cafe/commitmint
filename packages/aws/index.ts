import { AccessKey, CreateAccessKeyCommand, DeleteAccessKeyCommand, IAMClient } from '@aws-sdk/client-iam';
import { SourceModule, KeyInfo } from '@refreshly/core';
import * as assert from 'assert';

export class AWSModule extends SourceModule {
  #options: AWSModule.Options;
  #accessKey?: AccessKey;

  constructor({ targets, ...options }: AWSModule.RawOptions) {
    super({ targets });

    this.#options = options;
  }

  get originalKeyInfos(): KeyInfo[] {
    return [
      {
        name: 'AWS_ACCESS_KEY_ID',
        value: this.#options.key,
      },
      {
        name: 'AWS_SECRET_ACCESS_KEY',
        value: this.#options.secretKey,
      },
    ];
  }

  async source(): Promise<KeyInfo[]> {
    const client = new IAMClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: this.#options.key,
        secretAccessKey: this.#options.secretKey,
      },
    });

    const { AccessKey } = await client.send(
      new CreateAccessKeyCommand({
        UserName: 'rain-ci',
      })
    );

    this.#accessKey = AccessKey;

    return [
      {
        name: 'AWS_ACCESS_KEY_ID',
        value: this.#accessKey.AccessKeyId,
      },
      {
        name: 'AWS_SECRET_ACCESS_KEY',
        value: this.#accessKey.SecretAccessKey,
      },
    ];
  }

  async revert(): Promise<void> {
    if (!this.#accessKey) return;

    // Retain the old key and cleanup the new key
    const client = new IAMClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: this.#options.key,
        secretAccessKey: this.#options.secretKey,
      },
    });

    await client.send(
      new DeleteAccessKeyCommand({
        AccessKeyId: this.#accessKey.AccessKeyId,
      })
    );
  }

  async cleanup(): Promise<void> {
    assert.ok(this.#accessKey);

    // Retain the new key and cleanup the old key
    const client = new IAMClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: this.#accessKey.AccessKeyId,
        secretAccessKey: this.#accessKey.SecretAccessKey,
      },
    });

    await client.send(
      new DeleteAccessKeyCommand({
        AccessKeyId: this.#options.key,
      })
    );
  }
}

export namespace AWSModule {
  export type Options = {
    key: string;
    secretKey: string;
    user: string;
  };

  export type RawOptions = Options & SourceModule.Options;
}
