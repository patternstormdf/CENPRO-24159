import {isDefined} from "./Utils";
import {Exception} from "./Exception";

export namespace Region {

    export type Code = "ap-east-1" |
        "ap-northeast-1" |
        "ap-northeast-2" |
        "ap-south-1" |
        "ap-southeast-1" |
        "ap-southeast-2" |
        "ca-central-1" |
        "eu-central-1" |
        "eu-north-1" |
        "eu-west-1" |
        "eu-west-2" |
        "eu-west-3" |
        "me-south-1" |
        "sa-east-1" |
        "us-east-1" |
        "us-east-2" |
        "us-west-1" |
        "us-west-2";

    export type Name = "Asia Pacific (Hong Kong)" |
        "Asia Pacific (Hong Kong)" |
        "Asia Pacific (Tokyo)" |
        "Asia Pacific (Seoul)" |
        "Asia Pacific (Mumbai)" |
        "Asia Pacific (Singapore)" |
        "Asia Pacific (Sydney)" |
        "Canada (Central)" |
        "EU (Frankfurt)" |
        "EU (Stockholm)" |
        "EU (Ireland)" |
        "EU (London)" |
        "EU (Paris)" |
        "Middle East (Bahrain)" |
        "South America (Sao Paulo)" |
        "US East (N. Virginia)" |
        "US East (Ohio)" |
        "US West (N. California)" |
        "US West (Oregon)";
}

export class Region {
    private static readonly map: Map<Region.Code, Region.Name> = new Map([
        ["ap-east-1", "Asia Pacific (Hong Kong)"],
        ["ap-northeast-1", "Asia Pacific (Tokyo)"],
        ["ap-northeast-2", "Asia Pacific (Seoul)"],
        ["ap-south-1", "Asia Pacific (Mumbai)"],
        ["ap-southeast-1", "Asia Pacific (Singapore)"],
        ["ap-southeast-2", "Asia Pacific (Sydney)"],
        ["ca-central-1", "Canada (Central)"],
        ["eu-central-1", "EU (Frankfurt)"],
        ["eu-north-1", "EU (Stockholm)"],
        ["eu-west-1", "EU (Ireland)"],
        ["eu-west-2", "EU (London)"],
        ["eu-west-3", "EU (Paris)"],
        ["me-south-1", "Middle East (Bahrain)"],
        ["sa-east-1", "South America (Sao Paulo)"],
        ["us-east-1", "US East (N. Virginia)"],
        ["us-east-2", "US East (Ohio)"],
        ["us-west-1", "US West (N. California)"],
        ["us-west-2", "US West (Oregon)"]
    ]);
    code: Region.Code;
    name: Region.Name;

    constructor(code: string) {
        try {
            this.code = <Region.Code>code;
            const name: Region.Name | undefined = Region.map.get(this.code);
            if (isDefined(name)) this.name = name;
            else throw new Region.UnknownName(code);
        } catch (ex) {
            if (ex instanceof Region.Exception) throw ex;
            else throw new Region.Exception(code, ex.message);
        }
    }

    static Exception = class extends Exception {
        constructor(code: string, message: string) {
            super(`Region.constructor(${code}) error=[${message}]`);
        }
    }

    static UnknownName = class extends Region.Exception {
        constructor(code: string) {
            super(code, `Could not find the name of region ${code}`);
        }
    }
}

export const regions: Region[] = [
    new Region("ap-south-1"),
    new Region("ap-northeast-2"),
    new Region("ap-southeast-1"),
    new Region("ap-southeast-2"),
    new Region("ap-northeast-1"),
    new Region("ca-central-1"),
    new Region("eu-central-1"),
    new Region("eu-west-1"),
    new Region("eu-west-2"),
    new Region("sa-east-1"),
    new Region("us-east-1"),
    new Region("us-east-2"),
    new Region("us-west-1"),
    new Region("us-west-2")];
