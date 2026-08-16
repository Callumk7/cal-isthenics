// Vitest resolves the Workers-only module to this file. Tests that import
// server modules should mock the bindings they exercise.
export const env = {} as Cloudflare.Env
