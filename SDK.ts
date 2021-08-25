import * as AWS from "aws-sdk";
import {Exception} from "./Exception";
import {Region} from "./Region";
import {isDefined} from "./Utils";

export namespace SDK {

    export function region(region: string): void {
        AWS.config.update({region: region})
    }

    export function profile(profile: string): void {
        const credentials = new AWS.SharedIniFileCredentials({profile: profile});
        AWS.config.credentials = credentials;
    }

    export type Params = {
        readonly accountId: string
        readonly region: string
        readonly accessKeyId: string
        readonly secretAccessKey: string
        readonly sessionToken: string
    }

    export class Session {
        readonly params: Params;

        constructor(params: Params) {
            this.params = params;
        }

        client<T>(type: (new (params: AWS.DataPipeline.ClientConfiguration) => T)): T {
            return new type(this.params);
        }

        static async init(account: string, region: Region, role: string): Promise<Session> {
            try {
                const sts: AWS.STS = new AWS.STS();
                let credentials: AWS.STS.Types.Credentials | undefined

                const params: AWS.STS.Types.AssumeRoleRequest = {
                    RoleArn: `arn:aws:iam::${account}:role/${role}`,
                    RoleSessionName: `${role}`
                }
                const response: AWS.STS.Types.AssumeRoleResponse = await sts.assumeRole(params).promise();
                credentials = response.Credentials;
                if (isDefined(credentials)) {
                    return new Session({
                        accountId: account,
                        region: region.code,
                        accessKeyId: credentials.AccessKeyId,
                        secretAccessKey: credentials.SecretAccessKey,
                        sessionToken: credentials.SessionToken,
                    });
                } else {
                    throw new Session.NoCredentialsReturned(region, account, params);
                }
            } catch (ex) {
                if (ex instanceof Session.Exception) throw ex;
                else throw new Session.Exception(region, account, ex.message)
            }
        }

        static Exception = class extends Exception {
            constructor(region: Region, account: string, message: string) {
                super(`SDK.init(${region.code},${account}) error=${message}`);
            }
        }

        static NoCredentialsReturned = class extends Session.Exception {
            constructor(region: Region, account: string, params: AWS.STS.Types.AssumeRoleRequest) {
                super(region, account, `AWS.STS.AssumeRole(${params}) returned no credentials`);
            }
        }
    }
}
