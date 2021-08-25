import * as AWS from "aws-sdk";
import {hash, isDefined} from "./Utils";
import {SDK} from "./SDK";
import {Exception} from "./Exception";

export namespace RDS {

    export async function createCluster(sdk: SDK.Session,
                                        owner: string,
                                        purpose: string,
                                        engine: string,
                                        engineVersion: string): Promise<Cluster> {
        const rds: AWS.RDS = sdk.client(AWS.RDS)
        const params: AWS.RDS.Types.CreateDBClusterMessage = {
            DatabaseName: "DatabaseName",
            DBClusterIdentifier: `${owner}-${purpose}-${engine}-${hash(engineVersion).toString()}-test`,
            Engine: engine,
            MasterUsername: owner,
            MasterUserPassword: owner,
            EngineVersion: engineVersion,
            Tags: [
                { Key: "owner", Value: owner },
                { Key: "purpose", Value: purpose }
            ]
        }
        const output: AWS.RDS.Types.CreateDBClusterResult = await rds.createDBCluster(params).promise()
        if (isDefined(output.DBCluster)) {
            if (isDefined(output.DBCluster.DBClusterIdentifier)) return new Cluster(output.DBCluster.DBClusterIdentifier)
            else throw new CreateClusterException("no cluster identifier returned")
        }
        else throw new CreateClusterException("no cluster description returned")

    }

    export class CreateClusterException extends Exception {
        constructor(message: string) {
            super(`AWS.RDS.createDBCluster: ${message}`);
        }
    }

    export namespace Cluster {

    }

    export class Cluster {
        identifier: string

        constructor(identifier: string) {
            this.identifier = identifier
        }
    }
}
