import { run } from "./run"

interface CloudFormationOutput {
  OutputKey: string
  OutputValue: string
}

const outputCache = new Map<string, CloudFormationOutput[]>()

/**
 * Synchronously fetches Outputs from a CloudFormation stack using the AWS CLI.
 *
 * @param stackName - The name of the CloudFormation stack.
 * @returns An array of CloudFormation outputs.
 * @throws If the command fails or if the JSON output cannot be parsed.
 */
function fetchOutputs(
  stackName: string,
): CloudFormationOutput[] {
  // Check if the outputs are already cached
  if (outputCache.has(stackName)) {
    return outputCache.get(stackName) || []
  }
  // Construct the AWS CLI command arguments
  const args = [
    "cloudformation",
    "describe-stacks",
    "--stack-name",
    stackName,
    "--query",
    "Stacks[0].Outputs",
    "--output",
    "json",
  ]

  const result = runAwsCommand(args)

  try {
    // Parse the JSON output from the AWS CLI
    const outputs: CloudFormationOutput[] = JSON.parse(result)
    // Cache the outputs to avoid redundant calls
    outputCache.set(stackName, outputs)
    return outputs
  } catch (err) {
    throw new Error(`Failed to parse JSON output: ${err}`)
  }
}

/**
 * Executes an AWS CLI command synchronously and returns the output.
 * @param args - The command-line arguments for the AWS CLI command.
 * @returns The standard output of the command.
 * @throws If the command fails or if there is an error.
 */
export const runAwsCommand = run.bind(null, "aws")

/**
 * Synchronously looks up an Output from a CloudFormation stack by key.
 *
 * @param stackName - The name of the CloudFormation stack.
 * @param key - The output key to look for.
 * @returns The output value if found; otherwise, null.
 */
export function lookup(
  stackName: string,
  key: string,
): string {
  const outputs = fetchOutputs(stackName)
  const output = outputs.find((o) => o.OutputKey === key)
  if (!output?.OutputValue) {
    throw new Error(
      `Output not found for stack: "${stackName}" and key: "${key}"`,
    )
  }
  return output.OutputValue
}

/**
 * Synchronously fetches a parameter from AWS Systems Manager Parameter Store.
 *
 * @param name - The name of the parameter.
 * @param query - The query string to filter the parameter.
 * @returns The parameter value if found; otherwise, null.
 * @throws If the command fails or if the JSON output cannot be parsed.
 */
export function getParameter(
  name: string,
  query?: string,
): string {
  const args = ["ssm", "get-parameter", "--name", name, "--query"]
  if (query) args.push(query)
  else args.push("Parameter.Value")

  return runAwsCommand(args)
}
