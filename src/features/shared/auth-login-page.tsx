import * as React from "react";
import { Check } from "lucide-react";
import loginHeroOne from "@/images/login/login_1.png";
import loginHeroTwo from "@/images/login/login_2.png";
import loginHeroThree from "@/images/login/login_3.png";
import logo from "@/images/logo/logo.svg";

interface AuthLoginPageProps {
  intro: string;
  loginTitle: string;
  onLogin: (account: string) => void;
  validateAccount: (account: string) => string | null;
}

const HERO_SLIDES = [
  {
    title: "一次接入",
    description: "统一接口调用所有主流国内大模型，降低集成成本与技术门槛",
    image: loginHeroOne,
  },
  {
    title: "财务管理",
    description: "查看消费记录和使用日志，及时账单支付，实时掌握财务报表",
    image: loginHeroTwo,
  },
  {
    title: "团队与 API 管理",
    description: "企业级 API Key 分发，精准用量追踪，支持多成员协作",
    image: loginHeroThree,
  },
];

export function AuthLoginPage({ intro, loginTitle, onLogin, validateAccount }: AuthLoginPageProps) {
  const [phone, setPhone] = React.useState("");
  const [code, setCode] = React.useState("");
  const [remember, setRemember] = React.useState(false);
  const [activeSlide, setActiveSlide] = React.useState(0);
  const [error, setError] = React.useState("");
  const canSubmit = phone.trim().length > 0 && code.trim().length > 0;
  const slide = HERO_SLIDES[activeSlide];

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((index) => (index + 1) % HERO_SLIDES.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const loginAccount = phone.trim();
    const validationError = validateAccount(loginAccount);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    onLogin(loginAccount);
  }

  return (
    <main className="grid min-h-screen grid-cols-[minmax(520px,1fr)_minmax(520px,1fr)] overflow-hidden bg-white text-[#010d3e] max-[980px]:grid-cols-1">
      <section
        className="relative flex min-h-screen overflow-hidden px-12 py-12 max-[980px]:min-h-[520px] max-[640px]:px-6 max-[640px]:py-10"
        style={{ backgroundImage: "linear-gradient(218.66deg, #eaeefe 39.42%, #183ec2 100%)" }}
      >
        <div className="relative z-10 flex w-full flex-col">
          <div className="max-w-[552px]">
            <h1 className="bg-gradient-to-b from-black to-[#001354] bg-clip-text text-[52px] font-semibold leading-none tracking-normal text-transparent max-[1280px]:text-[44px] max-[640px]:text-[36px]">
              驱动您的AI业务
            </h1>
            <p className="mt-4 max-w-[552px] text-base font-medium leading-6 text-[#010d3e]">{intro}</p>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center pt-6">
            <HeroVisual slide={slide} />
            <div className="mt-5 text-center">
              <h2 className="bg-gradient-to-b from-black to-[#001354] bg-clip-text text-[26px] font-semibold leading-tight tracking-normal text-transparent">
                {slide.title}
              </h2>
              <p className="mt-2 text-base leading-6 text-[#010d3e]">{slide.description}</p>
            </div>
            <div className="mt-7 flex items-center gap-1" aria-label="登录页亮点轮播">
              {HERO_SLIDES.map((item, index) => (
                <button
                  key={item.title}
                  className={`h-0.5 w-16 transition-colors ${index === activeSlide ? "bg-[#1c49e5]" : "bg-black/50"}`}
                  type="button"
                  aria-label={`查看${item.title}`}
                  aria-current={index === activeSlide}
                  onClick={() => setActiveSlide(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center px-[120px] py-16 max-[1280px]:px-16 max-[640px]:min-h-auto max-[640px]:px-6">
        <div className="w-full">
          <div className="flex items-center gap-2">
            <img className="size-12 shrink-0" src={logo} alt="" />
            <div className="text-[34px] font-bold leading-none tracking-normal text-black">OmniAI</div>
          </div>

          <div className="mt-6">
            <h2 className="text-[28px] font-semibold leading-normal tracking-normal text-black">{loginTitle}</h2>
            <p className="mt-2 text-base leading-6 text-[#868e96]">请使用手机号登录</p>
          </div>

          <form className="mt-6 flex w-full flex-col gap-3" onSubmit={handleSubmit}>
            <LoginField label="手机号">
              <input
                className="h-12 w-full rounded-lg border border-[#ced4da] bg-white px-3 text-sm text-black outline-none transition-colors placeholder:text-[#adb5bd] focus:border-[#1c49e5]"
                value={phone}
                placeholder="输入你的手机号"
                inputMode="tel"
                autoComplete="tel"
                onChange={(event) => {
                  setPhone(event.target.value);
                  setError("");
                }}
              />
            </LoginField>

            <LoginField label="验证码">
              <div className="flex h-12 items-center rounded-lg border border-[#ced4da] bg-white px-3 transition-colors focus-within:border-[#1c49e5]">
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm text-black outline-none placeholder:text-[#adb5bd]"
                  value={code}
                  placeholder="输入你的短信验证码"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  onChange={(event) => {
                    setCode(event.target.value);
                    setError("");
                  }}
                />
                <button className="shrink-0 text-sm font-medium text-[#1c49e5]" type="button">
                  {code ? "重新发送" : "获取验证码"}
                </button>
              </div>
            </LoginField>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm leading-[1.4] tracking-normal text-[#868e96]">
                <span
                  className={`flex size-5 items-center justify-center rounded-md border transition-colors ${
                    remember ? "border-[#1c49e5] bg-[#1c49e5] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]" : "border-[#ced4da] bg-white text-transparent"
                  }`}
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <input className="sr-only" type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                30天保持登录
              </label>
            </div>

            {error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-600" role="alert">
                {error}
              </div>
            ) : null}

            <button
              className="mt-1 flex h-12 w-full items-center justify-center rounded-lg bg-[#1c49e5] text-sm font-semibold text-white transition-colors hover:bg-[#183ec2] disabled:bg-[#e9ecef] disabled:text-[#adb5bd]"
              disabled={!canSubmit}
              type="submit"
            >
              登录
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-3 text-sm leading-[1.4] tracking-normal">
            <span className="text-[#868e96]">还没有账户？</span>
            <button className="font-medium text-[#1c49e5]" type="button">
              注册
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroVisual({ slide }: { slide: (typeof HERO_SLIDES)[number] }) {
  return (
    <div className="relative flex size-[min(40vw,380px)] min-h-[280px] min-w-[280px] items-center justify-center max-[1280px]:size-[340px] max-[640px]:size-[260px] max-[640px]:min-h-[240px] max-[640px]:min-w-[240px]" aria-hidden="true">
      <img className="h-full w-full object-contain drop-shadow-[0_42px_80px_rgba(18,55,180,0.24)]" src={slide.image} alt="" />
    </div>
  );
}

function LoginField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold leading-[18px] text-black">{label}</span>
      {children}
    </label>
  );
}
