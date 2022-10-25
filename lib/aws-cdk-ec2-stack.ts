import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';

export class AwsCdkEc2Stack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * If you create a new VPC,
     * be aware that the CDK will create Nat Gateways
     * for you that costs quite a lot in the long run.
     * Add natGateways:0 to your VPC to not deploy any Nat Gateways.
     */
    const vpc = new ec2.Vpc(this, 'test-vpc', {
      natGateways: 0,
    });

    /**
     * Create a new security group.
     * With this setup the instance will have no inbound permission
     * and allow all outbound connections.
     */
    const securityGroup = new ec2.SecurityGroup(this, 'myVpc', {
      securityGroupName: 'test-security-group',
      vpc: vpc
    });

    /**
     * And add the EC2 instance, here is the code to use the latest
     * AWS Linux 2 AMI (Amazon Machine Image).
     * The instance type here is T3.micro and can be easily
     * changed in the instanceType property.
     * Per default, will the EC2 machine now be placed in the
     * isolated/private subnet of our newly created VPC.
     */
    const ec2Instance = new ec2.Instance(this,'ec2Instance', {
      instanceName: "test-ec2-instance",
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: new ec2.AmazonLinuxImage(),
      vpc: vpc,
      securityGroup: securityGroup
    });

    /**
     * Create a new S3 bucket
     */
     const s3Bucket = new s3.Bucket(this, 's3Bucket', {
      bucketName: 'test-bucket',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: false,
      publicReadAccess: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
          ],
          allowedOrigins: ['http://localhost:6000'],
          allowedHeaders: ['*'],
        },
      ],
      lifecycleRules: [
        {
          // abortIncompleteMultipartUploadAfter: cdk.Duration.days(90),
          // expiration: cdk.Duration.days(365),
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              // transitionAfter: cdk.Duration.days(30),
            },
          ],
        },
      ],
    });

    /**
     * Adding bucket policy for S3 bucket
     */
    s3Bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('ec2.amazonaws.com')],
        actions: ['s3.GetObject', 's3.PutObject', 's3.DeleteObject', 's3.ListBucket'],
        resources: [`${s3Bucket.bucketArn}/*`],
      })
    );
  }
}
