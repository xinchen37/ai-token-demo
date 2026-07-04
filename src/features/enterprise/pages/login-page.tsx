import * as React from "react";
import { Building2, CircleHelp, Grid2X2, KeyRound, Phone } from "lucide-react";

interface EnterpriseLoginPageProps {
  accounts: Array<{ loginAccount: string; status: "启用" | "停用" | "正常" | "未激活" | "已冻结" }>;
  onLogin: (account: string) => void;
}

type LoginMode = "code" | "password";

export function EnterpriseLoginPage({ accounts, onLogin }: EnterpriseLoginPageProps) {
  const [mode, setMode] = React.useState<LoginMode>("code");
  const [phone, setPhone] = React.useState("");
  const [account, setAccount] = React.useState("");
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const canSubmit = mode === "code" ? phone.trim() && code.trim() : account.trim() && password.trim();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    const loginAccount = mode === "code" ? phone.trim() : account.trim();
    const matched = accounts.find((item) => item.loginAccount === loginAccount);
    if (!matched) {
      setError("账号不存在，请确认后重新输入。");
      return;
    }
    if (matched.status === "停用" || matched.status === "未激活" || matched.status === "已冻结") {
      setError("账号不可用，请联系经销商管理员。");
      return;
    }
    setError("");
    onLogin(loginAccount);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-950">
      <header className="flex h-[92px] items-center justify-between border-b border-slate-100 px-14">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[#3478ff] text-white shadow-lg shadow-blue-200">
            <Grid2X2 className="size-6" />
          </div>
          <div>
            <div className="text-xl font-bold leading-6">OmniAI</div>
            <div className="text-sm text-slate-500">企业客户控制台</div>
          </div>
        </div>
        <button className="flex items-center gap-2 text-base font-bold text-slate-500" type="button">
          <CircleHelp className="size-5" />
          帮助 / 联系支持
        </button>
      </header>

      <div className="flex min-h-[calc(100vh-150px)] justify-center px-12 pt-14">
        <div className="grid w-full max-w-[1560px] grid-cols-[minmax(620px,1fr)_520px] items-start gap-12">
          <section>
            <h1 className="max-w-[760px] text-[58px] font-extrabold leading-tight tracking-normal">一次接入，管理您的 AI 用量</h1>
            <p className="mt-6 max-w-[720px] text-[22px] font-medium leading-9 text-slate-500">企业客户可统一管理 API Key、查看消耗账单、模拟调用模型，并与团队成员协作完成 AI 接入。</p>
            <div className="mt-14 max-w-[960px] rounded-[18px] border border-slate-200 bg-white p-11">
              <div className="flex h-[410px] items-center justify-center rounded-[18px] bg-slate-200 shadow-xl shadow-slate-200">
                <div className="h-36 w-64 rounded-full bg-[radial-gradient(circle,rgba(248,250,252,0.96)_0%,rgba(226,232,240,0)_70%)]" />
              </div>
            </div>
          </section>

          <section className="min-h-[760px] rounded-[18px] border border-slate-200 bg-white px-12 py-12 shadow-xl shadow-slate-100">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-blue-50 text-[#3478ff]">
              <Building2 className="size-8" />
            </div>
            <h2 className="mt-8 text-[34px] font-extrabold leading-[42px]">企业客户登录</h2>
            <p className="mt-3 text-[17px] text-slate-500">{mode === "code" ? "请使用手机号登录" : "请使用账号和密码登录"}</p>
            <div className="mt-12 grid h-[66px] grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
              <ModeButton active={mode === "code"} icon={Phone} label="验证码登录" onClick={() => { setMode("code"); setError(""); }} />
              <ModeButton active={mode === "password"} icon={KeyRound} label="密码登录" onClick={() => { setMode("password"); setError(""); }} />
            </div>

            <form className="mt-12" onSubmit={handleSubmit}>
              {mode === "code" ? (
                <Field label="手机号">
                  <div className="flex h-[60px] overflow-hidden rounded-md border border-slate-200 shadow-sm">
                    <div className="flex w-[92px] items-center justify-center border-r border-slate-200 bg-slate-50 text-[17px] text-slate-600">+86</div>
                    <input className="min-w-0 flex-1 px-4 text-[17px] outline-none" value={phone} placeholder="请输入手机号" onChange={(event) => { setPhone(event.target.value); setError(""); }} />
                  </div>
                </Field>
              ) : (
                <Field label="账号">
                  <input className="h-[60px] w-full rounded-md border border-slate-200 px-4 text-[17px] outline-none focus:border-[#3478ff]" value={account} placeholder="请输入账号" onChange={(event) => { setAccount(event.target.value); setError(""); }} />
                </Field>
              )}

              {mode === "code" ? (
                <Field label="验证码" top>
                  <div className="grid grid-cols-[1fr_160px] gap-4">
                    <input className="h-[60px] rounded-md border border-slate-200 px-4 text-[17px] outline-none focus:border-[#3478ff]" value={code} placeholder="请输入收到的验证码" onChange={(event) => setCode(event.target.value)} />
                    <button className="h-[60px] rounded-md border border-slate-950 bg-white text-[17px] font-bold" type="button">获取验证码</button>
                  </div>
                </Field>
              ) : (
                <Field label="密码" top>
                  <input className="h-[60px] w-full rounded-md border border-slate-200 px-4 text-[17px] outline-none focus:border-[#3478ff]" value={password} type="password" placeholder="请输入登录密码" onChange={(event) => setPassword(event.target.value)} />
                </Field>
              )}

              {error ? <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-bold text-rose-600 shadow-lg shadow-rose-100" role="alert">{error}</div> : null}
              <button className="mt-7 h-16 w-full rounded-md bg-[#3478ff] text-[17px] font-bold text-white disabled:opacity-50" disabled={!canSubmit} type="submit">登录</button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

function ModeButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button className={`flex items-center justify-center gap-2 rounded-lg text-[17px] font-bold ${active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`} onClick={onClick} type="button">
      <Icon className="size-5" />
      {label}
    </button>
  );
}

function Field({ label, top, children }: { label: string; top?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${top ? "mt-7" : ""}`}>
      <span className="mb-3 block text-[17px] font-bold text-slate-800">{label}</span>
      {children}
    </label>
  );
}
