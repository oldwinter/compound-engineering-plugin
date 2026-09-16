import type { ClaudePlugin } from "../types/claude"
import { convertClaudeToOpenCode, type ClaudeToOpenCodeOptions } from "../converters/claude-to-opencode"
import { convertClaudeToCodex } from "../converters/claude-to-codex"
import { convertClaudeToPi } from "../converters/claude-to-pi"
import { convertClaudeToAntigravity } from "../converters/claude-to-antigravity"
import { writeOpenCodeBundle } from "./opencode"
import { writeCodexBundle } from "./codex"
import { writePiBundle } from "./pi"
import { writeAntigravityBundle } from "./antigravity"

export type TargetScope = "global" | "workspace"

export function isTargetScope(value: string): value is TargetScope {
  return value === "global" || value === "workspace"
}

/**
 * Validate a --scope flag against a target's supported scopes.
 * Returns the resolved scope (explicit or default) or throws on invalid input.
 */
export function validateScope(
  targetName: string,
  target: TargetHandler,
  scopeArg: string | undefined,
): TargetScope | undefined {
  if (scopeArg === undefined) return target.defaultScope

  if (!target.supportedScopes) {
    throw new Error(`Target "${targetName}" does not support the --scope flag.`)
  }
  if (!isTargetScope(scopeArg) || !target.supportedScopes.includes(scopeArg)) {
    throw new Error(`Target "${targetName}" does not support --scope ${scopeArg}. Supported: ${target.supportedScopes.join(", ")}`)
  }
  return scopeArg
}

export type TargetHandler<TBundle = unknown> = {
  name: string
  implemented: boolean
  /** Default scope when --scope is not provided. Only meaningful when supportedScopes is defined. */
  defaultScope?: TargetScope
  /** Valid scope values. If absent, the --scope flag is rejected for this target. */
  supportedScopes?: TargetScope[]
  convert: (plugin: ClaudePlugin, options: ClaudeToOpenCodeOptions) => TBundle | null
  write: (outputRoot: string, bundle: TBundle, scope?: TargetScope) => Promise<void>
}

export const targets: Record<string, TargetHandler> = {
  opencode: {
    name: "opencode",
    implemented: true,
    convert: convertClaudeToOpenCode,
    write: writeOpenCodeBundle as TargetHandler["write"],
  },
  codex: {
    name: "codex",
    implemented: true,
    convert: convertClaudeToCodex as TargetHandler["convert"],
    write: ((outputRoot, bundle) =>
      writeCodexBundle(outputRoot, bundle as Parameters<typeof writeCodexBundle>[1], {
        outputIsCodexRoot: true,
      })) as TargetHandler["write"],
  },
  pi: {
    name: "pi",
    implemented: true,
    convert: convertClaudeToPi as TargetHandler["convert"],
    write: writePiBundle as TargetHandler["write"],
  },
  antigravity: {
    name: "antigravity",
    implemented: true,
    convert: convertClaudeToAntigravity as TargetHandler["convert"],
    write: writeAntigravityBundle as TargetHandler["write"],
  },
}

/**
 * Converter modules that are cleanup / regression only.
 * Not user-facing `--to` convert targets; native plugin install stays preferred.
 * Every `src/converters/claude-to-*.ts` file must be listed here or in `targets`.
 */
export const COMPATIBILITY_CONVERTERS = ["copilot", "droid", "kiro"] as const

export type CompatibilityConverter = (typeof COMPATIBILITY_CONVERTERS)[number]

export function implementedConvertTargetNames(): string[] {
  return Object.entries(targets)
    .filter(([, handler]) => handler.implemented)
    .map(([name]) => name)
}

export function convertToFlagDescription(): string {
  return `Target format (${implementedConvertTargetNames().join(" | ")} | all)`
}

export function unknownConvertTargetMessage(targetName: string): string {
  const options = `${implementedConvertTargetNames().join(", ")}, all`
  if ((COMPATIBILITY_CONVERTERS as readonly string[]).includes(targetName)) {
    return `Unknown target: ${targetName}. ${targetName} is cleanup / native plugin install only, not a --to convert target. Use one of: ${options}`
  }
  return `Unknown target: ${targetName}. Use one of: ${options}`
}

export function requireImplementedConvertTarget(targetName: string): TargetHandler {
  const target = targets[targetName]
  if (!target) {
    throw new Error(unknownConvertTargetMessage(targetName))
  }
  if (!target.implemented) {
    throw new Error(`Target ${targetName} is registered but not implemented yet.`)
  }
  return target
}
