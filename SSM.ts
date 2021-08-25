import ssmcode from "./SSM.json"
import * as AWS from "aws-sdk";
import {SDK} from "./SDK";
import {delay, isDefined} from "./Utils";
import {Exception} from "./Exception";

export namespace SSM {

    export async function createDocument(sdk: SDK.Session, owner: string, purpose: string): Promise<Document> {
        const ssm: AWS.SSM = sdk.client(AWS.SSM)
        const params: AWS.SSM.Types.CreateDocumentRequest = {
            Content: JSON.stringify(ssmcode),
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
            if (isDefined(output.DocumentDescription.Name)) return new Document(ssm, output.DocumentDescription.Name)
            else throw new CreateDocumentException("no document name returned")
        }
        else throw new CreateDocumentException("no document description returned")
    }

    export class CreateDocumentException extends Exception {
        constructor(message: string) {
            super(`AWS.SSM.createDocument: ${message}`);
        }
    }

    export namespace Document {
        export type Output = {
            [key: string]: Array<string>
        }
    }

    export class Document {
        ssm: AWS.SSM
        name: string
        executionId?: string

        constructor(ssm: AWS.SSM, name: string) {
            this.ssm = ssm
            this.name = name
        }

        private async waitForExecutionTermination(executionId: string) : Promise<Document.Output> {
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
                            } else throw new Document.GetExecutionException(this.name, "no outputs returned")
                        }
                        default: {
                            await delay(1000)
                            return await this.waitForExecutionTermination(executionId)
                        }
                    }
                } else throw new Document.GetExecutionException(this.name, "no execution status returned")
            } else throw new Document.GetExecutionException(this.name, "no execution description returned")
        }

        async execute(role: string, clusterId: string): Promise<Document.Output> {
            const params: AWS.SSM.Types.StartAutomationExecutionRequest = {
                DocumentName: this.name,
                Parameters: {
                    AutomationAssumeRole: [role],
                    ClusterId: [clusterId]
                }
            }
            const output: AWS.SSM.Types.StartAutomationExecutionResult  = await this.ssm.startAutomationExecution(params).promise()
            if (isDefined(output.AutomationExecutionId)) return await this.waitForExecutionTermination(output.AutomationExecutionId)
            else throw new Document.StartExecutionException(this.name, "no execution id returned")
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
