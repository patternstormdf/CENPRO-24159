import {SDK} from "../SDK";
import {Region} from "../Region";
import {RDS} from "../RDS";
import {SSM} from "../SSM";

const account: string = "162174280605"  //P2VPTPMsCentralProduct
const region: Region = new Region("us-east-1")
const profile: string = "saas-cost-optimization-2" //Change to your AWS profile with your credentials
const role = "ESW-CO-PowerUser-P2" //Change if you want to use another role
const owner = "cpaniagua" //Change to your ADFS user identifier. Used to tag created resources.
const purpose = "CENPRO-24124"


test('Create a new Aurora cluster', async (done) => {
    SDK.profile(profile)
    const sdk: SDK.Session = await SDK.Session.init(account, region, role)
    console.log("Creating the Aurora Cluster...")
    const cluster: RDS.Cluster = await RDS.createCluster(sdk, owner, purpose, "aurora-mysql", "5.7.mysql_aurora.2.04.5")
    console.log(`Cluster Identifier: ${cluster.identifier}`)
    done();
}, 30000)

test('Run the SSM runbook on an existing Aurora Cluster', async (done) => {
    const clusterId = "cluster.identifier" //Add here the Aurora cluster identifier
    SDK.profile(profile)
    const sdk: SDK.Session = await SDK.Session.init(account, region, role)
    const document: SSM.Document = await SSM.createDocument(sdk, owner, purpose)
    console.log("Executing the SSM Document...")
    const output: SSM.Document.Output = await document.execute(`arn:aws:iam::${account}:role/${role}`, clusterId)
    await document.delete()
    console.log(JSON.stringify(output))
    done();
}, 30000)
