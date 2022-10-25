import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as ecs from '@aws-cdk/aws-ecs';

export class AwsCdkEc2Stack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * 👇 Prefix for all resources
     */
    const projectName = 'backend-api';

    /**
     * 👇 If you create a new VPC,
     * be aware that the CDK will create Nat Gateways
     * for you that costs quite a lot in the long run.
     * Add natGateways:0 to your VPC to not deploy any Nat Gateways.
     */
    const vpc = new ec2.Vpc(this, `${projectName}-vpc`, {
      cidr: '10.0.0.0/16',
      vpcName: `${projectName}-vpc`,
      natGateways: 0,
      subnetConfiguration: [
        {name: 'public', cidrMask: 24, subnetType: ec2.SubnetType.PUBLIC},
      ],
    });

    /**
     * 👇 Create a new security group.
     * With this setup the instance will have no inbound permission
     * and allow all outbound connections.
     */
    const securityGroup = new ec2.SecurityGroup(this, `${projectName}-security-group`, {
      vpc,
      allowAllOutbound: true,
      securityGroupName: `${projectName}-security-group`,
    });

    /**
     * 👇 Add inbound permission to the security group.
     * TCP port 22 is required to SSH into the instance.
     */
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'allow SSH access from anywhere',
    );

    /**
     * 👇 Add inbound permission to the security group.
     * HTTP port 80 is required to access the application.
     */
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'allow HTTP traffic from anywhere',
    );

    /**
     * 👇 Add inbound permission to the security group.
     * HTTPS port 443 is required to access the application.
     */
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'allow HTTPS traffic from anywhere',
    );

    /**
     * 👇 Create a Role for the EC2 Instance
     */
    const role = new iam.Role(this, `${projectName}-role`, {
      roleName: `${projectName}-role`,
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
      ],
    });

    /**
     * 👇 And add the EC2 instance, here is the code to use the latest
     * AWS Linux 2 AMI (Amazon Machine Image).
     * The instance type here is T3.micro and can be easily
     * changed in the instanceType property.
     * Per default, will the EC2 machine now be placed in the
     * isolated/private subnet of our newly created VPC.
     */
    const ec2Instance = new ec2.Instance(this, `${projectName}-ec2-instance`, {
      vpc,
      instanceName: `${projectName}-ec2-instance`,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      role,
      securityGroup,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE2,
        ec2.InstanceSize.MICRO,
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      keyName: `${projectName}-ec2-key-pair`,
    });
  }
}
