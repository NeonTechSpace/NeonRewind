interface ArtifactContract<Artifact> {
  allows(value: unknown): value is Artifact;
}

export function assertArtifactContract<Artifact>(
  contract: ArtifactContract<Artifact>,
  value: unknown,
  label: string,
): Artifact {
  if (!contract.allows(value)) {
    throw new Error(`${label} does not match its contract.`);
  }
  return value;
}
