"use client";
import { useActionState } from "react";
import { login } from "./actions";
export default function LoginForm() {
  const [state, action, pending] = useActionState(login, { message: "" });

  return (
    <form action={action}>
      <label className="old-field">
        電子郵件
        <input
          required
          type="email"
          name="email"
          autoComplete="username"
          maxLength={254}
        />
      </label>
      <label className="old-field">
        密碼
        <input
          required
          type="password"
          name="password"
          autoComplete="current-password"
          maxLength={1024}
        />
      </label>
      {state.message && <p role="alert">{state.message}</p>}
      <button disabled={pending}>{pending ? "登入中…" : "登入"}</button>
    </form>
  );
}
