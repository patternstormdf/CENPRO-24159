import {SDK} from "../SDK";
import {Region} from "../Region";
import {SSM} from "../SSM";

const account: string = "162174280605"  //P2VPTPMsCentralProduct
const region: Region = new Region("us-east-1")
const profile: string = "saas-cost-optimization-2" //Change to your AWS profile with your credentials
const role = "ESW-CO-PowerUser-P2" //Change if you want to use another role
const owner = "cpaniagua" //Change to your ADFS user identifier. Used to tag created resources.
const purpose = "CENPRO-24159"


test('test runbook', async (done) => {

    const code: SSM.Code = {
        schemaVersion: "0.3",
        assumeRole: "{{ AutomationAssumeRole }}",
        parameters: {
            AutomationAssumeRole: {
                type: "String"
            },
            ClusterId: {
                type: "String"
            }
        },
        mainSteps: [
            {
                name: "sleep",
                action: "aws:sleep",
                inputs: {
                    "Duration": "PT2S"
                },
                nextStep: "describeCluster"
            },
            {
                name: "describeCluster",
                action: "aws:executeAwsApi",
                inputs: {
                    Service: "rds",
                    Api: "DescribeDBClusters",
                    Filters: [{
                        Name: "db-cluster-id",
                        Values: ["{{ ClusterId }}"]}
                    ]
                },
                outputs: [
                    {
                        Name: "ClusterId",
                        Selector: "$.DBClusters[0].DBClusterIdentifier",
                        Type: "String"
                    },
                    {
                        Name: "CustomEndpoints",
                        Selector: "$.DBClusters[0].CustomEndpoints",
                        Type: "StringList"
                    },
                    {
                        Name: "Engine",
                        Selector: "$.DBClusters[0].Engine",
                        Type: "String"
                    },
                    {
                        Name: "EngineVersion",
                        Selector: "$.DBClusters[0].EngineVersion",
                        Type: "String"
                    }
                ],
                isEnd: true
            }
        ],
        outputs: [
            "describeCluster.ClusterId",
            "describeCluster.Engine",
            "describeCluster.EngineVersion",
            "describeCluster.CustomEndpoints"
        ]
    }

    SDK.profile(profile)
    const sdk: SDK.Session = await SDK.Session.init(account, region, role)
    const runbook: SSM.Runbook = await SSM.createRunbook(sdk, owner, purpose, code)
    try {
        console.log("Executing the SSM Runbook...")
        const output: SSM.Runbook.Output = await runbook.execute({
            AutomationAssumeRole: [`arn:aws:iam::${account}:role/${role}`],
            ClusterId: ["lm-conn-pool-test-pg-serverless"]
        })
        console.log(JSON.stringify(output))
    } finally {
        await runbook.delete()
    }
    done();
}, 30000)
