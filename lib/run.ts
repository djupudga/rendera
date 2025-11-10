import { spawnSync } from "child_process"

/**
 * Executes a command synchronously and returns the output.
 * @param cmd - The command to execute
 * @param args - The command-line arguments for the command.
 * @returns The standard output of the command.
 * @throws If the command fails or if there is an error.
 */
export function run(cmd: string, args: string[]) {
  const result = spawnSync(cmd, args, {
    encoding: "utf-8",
    env: process.env,
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(result.stderr)
  }
  return result.stdout
}
