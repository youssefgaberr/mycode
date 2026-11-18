import { Suspense } from "react";
import { login } from "../actions";

async function LoginForm({ searchParams }: Pick<PageProps<"/admin/login">, "searchParams">) {
  const { error } = await searchParams;
  return (
    <form action={login} className="mx-auto mt-16 max-w-sm space-y-4 rounded-2xl border border-border bg-surface p-6">
      <h1 className="text-2xl font-extrabold">Admin login</h1>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          Wrong password.
        </p>
      )}
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-semibold">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 w-full rounded-lg border border-border bg-bg px-3"
        />
      </div>
      <button className="h-12 w-full rounded-xl bg-brand font-bold text-brand-fg hover:bg-brand-hover">Log in</button>
    </form>
  );
}

export default function LoginPage(props: PageProps<"/admin/login">) {
  return (
    <Suspense>
      <LoginForm searchParams={props.searchParams} />
    </Suspense>
  );
}
