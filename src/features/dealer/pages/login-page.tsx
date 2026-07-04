import * as React from "react";
import { Building2, CircleHelp, Clock3, Grid2X2, KeyRound, Network, Phone, Shield } from "lucide-react";

interface DealerLoginPageProps {
  members: Array<{ loginAccount: string; status: "启用" | "停用" }>;
  onLogin: (account: string) => void;
}

type LoginMode = "code" | "password";

export function DealerLoginPage({ members, onLogin }: DealerLoginPageProps) {
  const [mode, setMode] = React.useState<LoginMode>("code");
  const [account, setAccount] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const canSubmit = mode === "code" ? phone.trim() && code.trim() : account.trim() && password.trim();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    const loginAccount = mode === "password" ? account.trim() : phone.trim();
    const member = members.find((item) => item.loginAccount === loginAccount);

    if (!member) {
      setError("账号不存在，请确认后重新输入。");
      return;
    }

    if (member.status !== "启用") {
      setError("账号已停用，请联系管理员。");
      return;
    }

    setError("");
    onLogin(loginAccount);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#fff", color: "#111827", overflowX: "hidden" }}>
      <header style={{ height: 92, borderBottom: "1px solid #eef2f7", padding: "0 56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#3478ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 8px 18px rgba(52,120,255,0.22)" }}>
            <Grid2X2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: 20, lineHeight: "24px", fontWeight: 700 }}>OmniAI</div>
            <div style={{ fontSize: 14, lineHeight: "20px", color: "#64748b" }}>经销商控制台</div>
          </div>
        </div>
        <button style={plainButtonStyle}>
          <CircleHelp size={18} />
          帮助 / 联系支持
        </button>
      </header>

      <div style={{ minHeight: "calc(100vh - 150px)", padding: "58px 48px 0", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 1560, display: "grid", gridTemplateColumns: "minmax(620px, 1fr) 520px", columnGap: 48, alignItems: "start" }}>
          <section>
            <div style={{ maxWidth: 760 }}>
              <h1 style={{ margin: 0, fontSize: 58, lineHeight: 1.18, fontWeight: 800, letterSpacing: 0 }}>
                驱动您的 AI 分销业务
              </h1>
              <p style={{ margin: "24px 0 0", maxWidth: 720, fontSize: 22, lineHeight: "36px", color: "#64748b", fontWeight: 500 }}>
                专为经销商打造的企业级管理平台。高效管理下级客户、API 用量统计与团队协作，一站式赋能您的 AI 商业化落地。
              </p>
            </div>

            <div style={{ marginTop: 58, maxWidth: 960, border: "1px solid #e5eaf1", borderRadius: 18, padding: 44, background: "#fff" }}>
              <div style={{ height: 410, borderRadius: 18, background: "#dcdcdc", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 24px rgba(15,23,42,0.12)" }}>
                <div style={{ width: 260, height: 140, borderRadius: "50%", background: "radial-gradient(circle, rgba(238,242,247,0.95) 0%, rgba(220,220,220,0) 70%)" }} />
              </div>
            </div>

            <div style={{ marginTop: 52, maxWidth: 920, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", columnGap: 52 }}>
              <Feature icon={Network} title="一次接入" description="统一接口调用所有主流国内大模型，降低集成成本与技术门槛。" />
              <Feature icon={Clock3} title="客户管理" description="灵活配置产品定价，精细化管理下游客户，实时掌握财务报表。" />
              <Feature icon={Shield} title="团队与 API 管理" description="企业级 API Key 分发，精准用量追踪，支持多成员协作。" />
            </div>
          </section>

          <section style={{ width: 520, minHeight: 900, border: "1px solid #e5eaf1", borderRadius: 18, padding: "48px 48px 40px", background: "#fff", boxShadow: "0 14px 30px rgba(15,23,42,0.06)" }}>
            <div style={{ width: 66, height: 66, borderRadius: 20, background: "#eef4ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#3478ff" }}>
              <Building2 size={34} />
            </div>
            <h2 style={{ margin: "34px 0 0", fontSize: 34, lineHeight: "42px", fontWeight: 800 }}>经销商登录</h2>
            <p style={{ margin: "14px 0 0", fontSize: 17, color: "#64748b" }}>{mode === "code" ? "请使用手机号登录" : "请使用账号和密码登录"}</p>

            <div style={{ marginTop: 48, height: 66, border: "1px solid #e5eaf1", borderRadius: 12, background: "#f8fafc", padding: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <ModeButton active={mode === "code"} icon={Phone} label="验证码登录" onClick={() => { setMode("code"); setError(""); }} />
              <ModeButton active={mode === "password"} icon={KeyRound} label="密码登录" onClick={() => { setMode("password"); setError(""); }} />
            </div>

            <form style={{ marginTop: 48 }} onSubmit={handleSubmit}>
              {mode === "code" ? (
                <FieldLabel label="手机号">
                  <div style={{ height: 60, display: "flex", border: "1px solid #dce3ed", borderRadius: 6, overflow: "hidden", boxShadow: "0 2px 8px rgba(15,23,42,0.05)" }}>
                    <div style={{ width: 92, borderRight: "1px solid #dce3ed", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: "#475569" }}>
                      +86
                    </div>
                    <input autoComplete="tel" onChange={(event) => { setPhone(event.target.value); setError(""); }} placeholder="请输入手机号" value={phone} style={inputStyle} />
                  </div>
                </FieldLabel>
              ) : (
                <FieldLabel label="账号">
                  <input autoComplete="username" onChange={(event) => { setAccount(event.target.value); setError(""); }} placeholder="请输入账号" value={account} style={{ ...inputStyle, height: 60, border: "1px solid #dce3ed", borderRadius: 6 }} />
                </FieldLabel>
              )}

              {mode === "code" ? (
                <FieldLabel label="验证码" top={28}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 16 }}>
                    <input autoComplete="one-time-code" onChange={(event) => setCode(event.target.value)} placeholder="请输入收到的验证码" value={code} style={{ ...inputStyle, height: 60, border: "1px solid #dce3ed", borderRadius: 6 }} />
                    <button type="button" style={secondaryButtonStyle}>获取验证码</button>
                  </div>
                </FieldLabel>
              ) : (
                <FieldLabel label="密码" top={28}>
                  <input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} placeholder="请输入登录密码" type="password" value={password} style={{ ...inputStyle, height: 60, border: "1px solid #dce3ed", borderRadius: 6 }} />
                </FieldLabel>
              )}

              {error ? <div role="alert" style={toastStyle}>{error}</div> : null}

              <button disabled={!canSubmit} style={{ ...primaryButtonStyle, opacity: canSubmit ? 1 : 0.55 }} type="submit">登录</button>
            </form>

            <button style={{ ...plainButtonStyle, margin: "130px auto 0", color: "#3478ff", fontSize: 15 }}>
              <CircleHelp size={17} />
              联系管理员
            </button>
          </section>
        </div>
      </div>

      <footer style={{ height: 58, display: "flex", alignItems: "center", justifyContent: "center", gap: 26, color: "#64748b", fontSize: 16 }}>
        <span>© 2026 OmniAI. All rights reserved.</span>
        <span>服务条款</span>
        <span>·</span>
        <span>隐私政策</span>
      </footer>
    </main>
  );
}

function ModeButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: React.ComponentType<{ size?: number }>; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} type="button" style={{ border: 0, borderRadius: 9, background: active ? "#fff" : "transparent", color: active ? "#111827" : "#64748b", fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: active ? "0 2px 8px rgba(15,23,42,0.08)" : "none" }}>
      <Icon size={20} />
      {label}
    </button>
  );
}

function FieldLabel({ label, top = 0, children }: { label: string; top?: number; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginTop: top }}>
      <span style={{ display: "block", marginBottom: 12, fontSize: 17, fontWeight: 700, color: "#1f2937" }}>{label}</span>
      {children}
    </label>
  );
}

function Feature({ icon: Icon, title, description }: { icon: React.ComponentType<{ size?: number }>; title: string; description: string }) {
  return (
    <article>
      <div style={{ width: 56, height: 56, borderRadius: 13, background: "#eef4ff", color: "#3478ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={28} />
      </div>
      <h3 style={{ margin: "24px 0 0", fontSize: 22, lineHeight: "30px", fontWeight: 800 }}>{title}</h3>
      <p style={{ margin: "14px 0 0", fontSize: 17, lineHeight: "30px", color: "#64748b", fontWeight: 500 }}>{description}</p>
    </article>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  border: 0,
  outline: "none",
  padding: "0 18px",
  fontSize: 17,
  color: "#1f2937",
  background: "#fff",
};

const plainButtonStyle: React.CSSProperties = {
  border: 0,
  background: "transparent",
  padding: 0,
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#64748b",
  fontSize: 16,
  fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
  height: 60,
  border: "1px solid #111827",
  borderRadius: 6,
  background: "#fff",
  color: "#111827",
  fontSize: 17,
  fontWeight: 700,
};

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  height: 64,
  marginTop: 28,
  border: 0,
  borderRadius: 6,
  background: "#3478ff",
  color: "#fff",
  fontSize: 17,
  fontWeight: 700,
};

const toastStyle: React.CSSProperties = {
  marginTop: 16,
  border: "1px solid #fecdd3",
  borderRadius: 8,
  background: "#fff1f2",
  color: "#e11d48",
  padding: "11px 14px",
  fontSize: 15,
  fontWeight: 700,
  lineHeight: "22px",
  boxShadow: "0 10px 24px rgba(225,29,72,0.12)",
};
