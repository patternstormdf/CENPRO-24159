import * as AWS from "aws-sdk";
import {SDK} from "./SDK";
import {delay, isDefined} from "./Utils";
import {Exception} from "./Exception";
import {AutomationParameterValueList} from "aws-sdk/clients/ssm";

export namespace SSM {

    export type Code = {
        schemaVersion: "0.3"
        assumeRole?: string
        description?: string
        parameters?: Code.Parameters
        mainSteps: Code.Steps
        outputs: [string]
    }

    export namespace Code {

        export namespace Parameter {

            interface BaseParam<T> {
                type: "String" | "StringList" | "Integer" | "Boolean" | "MapList" | "StringMap"
                description?: string
                default?: T
                allowedValues?: Array<T>
            }

            export interface String extends BaseParam<string> {
                type: "String"
            }

            export interface Integer extends BaseParam<number> {
                type: "Integer"
            }

            export interface Boolean extends BaseParam<boolean> {
                type: "Boolean"
            }

        }

        type Parameter = Parameter.String | Parameter.Integer | Parameter.Boolean

        export type Parameters = {
            [key: string]: Parameter
        }

        export namespace Step {

            interface BaseStep {
                name: string
                action: "aws:sleep" | "aws:executeAwsApi"
                maxAttempts?: number
                timeoutSeconds?: number
                onFailure?: "Abort" | "Continue" | string
                onCancel?: "Abort" | string
                isEnd?: boolean
                nextStep?: string
                isCritical?: boolean
                inputs: Step.Inputs
            }

            export type Input = {}
            export type Inputs = Sleep.Inputs | ExecuteAWSApi.Inputs

            export interface Sleep extends BaseStep {
                action: "aws:sleep"
                inputs: Sleep.Inputs
            }

            export namespace Sleep {
                export type Inputs = {
                    Duration: string
                }
            }

            export interface ExecuteAWSApi extends BaseStep {
                action: "aws:executeAwsApi"
                inputs: ExecuteAWSApi.Inputs
                outputs: [{
                    Name: string,
                    Selector: string
                    Type: string
                }]
            }

            export namespace ExecuteAWSApi {
                export type Service = "rds" | "ec2"

                export type Inputs = {
                    Service: Service
                    Api: string
                    [key: string]: any
                }


            }
        }

        export type Step = Step.Sleep | Step.ExecuteAWSApi
        export type Steps = Array<Step>
    }

    export async function createRunbook(sdk: SDK.Session, owner: string, purpose: string, code: SSM.Code): Promise<Runbook> {
        const ssm: AWS.SSM = sdk.client(AWS.SSM)
        const params: AWS.SSM.Types.CreateDocumentRequest = {
            Content: JSON.stringify(code),
            Name: `${owner}-${purpose}-SSM-Document`,
            DocumentType: "Automation",
            TargetType: "/",
            Tags: [
                { Key: "owner", Value: owner },
                { Key: "purpose", Value: purpose }
            ]
        }
        const output: AWS.SSM.Types.CreateDocumentResult = await ssm.createDocument(params).promise()
        if (isDefined(output.DocumentDescription)) {
            if (isDefined(output.DocumentDescription.Name)) return new Runbook(ssm, output.DocumentDescription.Name)
            else throw new CreateRunbookException("no document name returned")
        }
        else throw new CreateRunbookException("no document description returned")
    }

    export class CreateRunbookException extends Exception {
        constructor(message: string) {
            super(`AWS.SSM.createDocument: ${message}`);
        }
    }

    export namespace Runbook {
        export type Output = {
            [key: string]: Array<string>
        }
    }

    export class Runbook {
        ssm: AWS.SSM
        name: string
        executionId?: string

        constructor(ssm: AWS.SSM, name: string) {
            this.ssm = ssm
            this.name = name
        }

        private async waitForExecutionTermination(executionId: string) : Promise<Runbook.Output> {
            const output: AWS.SSM.Types.GetAutomationExecutionResult = await this.ssm.getAutomationExecution({AutomationExecutionId: executionId}).promise()
            if (isDefined(output.AutomationExecution)) {
                if (isDefined(output.AutomationExecution.AutomationExecutionStatus)) {
                    const status = output.AutomationExecution.AutomationExecutionStatus
                    switch (status) {
                        case "Success":
                        case "TimedOut":
                        case "Cancelled":
                        case "Failed":
                        case "CompletedWithSuccess":
                        case "CompletedWithFailure": {
                            if (isDefined(output.AutomationExecution.Outputs)) {
                                return {
                                    ...output.AutomationExecution.Outputs,
                                    ...{status: [output.AutomationExecution.AutomationExecutionStatus]}
                                }
                            } else throw new Runbook.GetExecutionException(this.name, "no outputs returned")
                        }
                        default: {
                            await delay(1000)
                            return await this.waitForExecutionTermination(executionId)
                        }
                    }
                } else throw new Runbook.GetExecutionException(this.name, "no execution status returned")
            } else throw new Runbook.GetExecutionException(this.name, "no execution description returned")
        }

        //TODO generalize parameters
        async execute(parameters: {[key: string]: [string]}): Promise<Runbook.Output> {
            const params: AWS.SSM.Types.StartAutomationExecutionRequest = {
                DocumentName: this.name,
                Parameters: parameters
            }
            const output: AWS.SSM.Types.StartAutomationExecutionResult  = await this.ssm.startAutomationExecution(params).promise()
            if (isDefined(output.AutomationExecutionId)) return await this.waitForExecutionTermination(output.AutomationExecutionId)
            else throw new Runbook.StartExecutionException(this.name, "no execution id returned")
        }

        async delete(): Promise<void> {
            const params: AWS.SSM.Types.DeleteDocumentRequest = {
                Name: this.name
            }
            await this.ssm.deleteDocument(params).promise()
        }

        static StartExecutionException = class extends Exception {
            constructor(name: string, message: string) {
                super(`SSM.startAutomationExecution(${name}): ${message}`)
            }
        }

        static GetExecutionException = class extends Exception {
            constructor(name: string, message: string) {
                super(`SSM.getAutomationExceution(${name}): ${message}`)
            }
        }

    }

}
