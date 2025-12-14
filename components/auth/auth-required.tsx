import { AuthForm } from '@/components/auth-form'

export function AuthRequired() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-border bg-background px-4 py-6 pt-8 text-center sm:px-16">
          <h3 className="text-xl font-semibold text-foreground">Welcome to v0 Clone</h3>
          <p className="text-sm text-muted-foreground">
            Sign in to start generating UI components with AI
          </p>
        </div>
        <div className="flex flex-col space-y-4 bg-muted/50 px-4 py-8 sm:px-16">
          <AuthForm type="signin" />
        </div>
      </div>
    </div>
  )
}
