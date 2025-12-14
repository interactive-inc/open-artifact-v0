export type MissingEnvVar = {
  name: string
  description: string
  example: string
  required: boolean
}

const requiredEnvVars: MissingEnvVar[] = [
  {
    name: "V0_API_KEY",
    description: "Your v0 API key for generating apps",
    example: "v0_sk_...",
    required: true,
  },
  {
    name: "POSTGRES_URL",
    description: "PostgreSQL database connection string",
    example: "postgresql://user:password@localhost:5432/v0_clone",
    required: true,
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    description: "Supabase project URL",
    example: "https://your-project-ref.supabase.co",
    required: true,
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    description: "Supabase publishable (anon) key",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    required: true,
  },
]

export function checkRequiredEnvVars(): MissingEnvVar[] {
  const missing = requiredEnvVars.filter((envVar) => {
    const value = process.env[envVar.name]
    return !value || value.trim() === ""
  })

  return missing
}

export function hasAllRequiredEnvVars(): boolean {
  return checkRequiredEnvVars().length === 0
}
