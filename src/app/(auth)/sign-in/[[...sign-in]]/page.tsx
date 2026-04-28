import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">🌍 Mundo Academy</h1>
          <p className="text-slate-400 mt-2 text-sm">El sistema operativo del emprendedor</p>
        </div>
        <SignIn />
      </div>
    </div>
  );
}
