/**
 * Fixture mode for CI/local deterministic tests.
 * Enable by setting `FIXTURE_MODE=1` or `NODE_ENV=test`.
 */

export interface FixtureProfile {
  username: string;
  followers: number;
  following: number;
  imageUrl?: string;
}

const FIXTURES: Record<string, FixtureProfile> = {
  cristiano: {
    username: "cristiano",
    followers: 579000000,
    following: 500,
    imageUrl: "https://images.pathsocial.com/api/instagram/cristiano",
  },
  instagram: {
    username: "instagram",
    followers: 650000000,
    following: 100,
    imageUrl: "https://images.pathsocial.com/api/instagram/instagram",
  },
  kylie: {
    username: "kylie",
    followers: 400000000,
    following: 200,
    imageUrl: "https://images.pathsocial.com/api/instagram/kylie",
  },
  ke44in: {
    username: "ke44in",
    followers: 1200,
    following: 450,
    imageUrl: "https://images.pathsocial.com/api/instagram/ke44in",
  },
};

export function isFixtureMode(): boolean {
  return (
    process.env.FIXTURE_MODE === "1" ||
    process.env.FIXTURE_MODE === "true" ||
    process.env.NODE_ENV === "test"
  );
}

export function getFixture(username: string): FixtureProfile | null {
  const normalized = username.trim().toLowerCase().replace(/^@/, "");
  return FIXTURES[normalized] ?? null;
}
