import * as React from "react";
import { Save, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DealerProfile } from "../types";

interface ProfilePageProps {
  profile: DealerProfile;
  onSave: (profile: DealerProfile) => void;
}

export function ProfilePage({ profile, onSave }: ProfilePageProps) {
  const [draft, setDraft] = React.useState(profile);
  const [password, setPassword] = React.useState({ current: "", next: "", confirm: "" });
  const [message, setMessage] = React.useState("");

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(draft);
    setMessage("个人信息已保存到本地。");
  }

  function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(password.next && password.next === password.confirm ? "密码修改已模拟保存。" : "两次新密码不一致。");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
        <div className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-[#101a3d] text-2xl font-bold text-white">{draft.avatarText}</div>
          <div>
            <h2 className="text-xl font-semibold text-slate-950">个人信息</h2>
            <p className="mt-1 text-sm text-slate-500">维护经销商管理员资料，数据保存在本地。</p>
          </div>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSave}>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-600">姓名</span>
            <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-600">角色</span>
            <Input value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))} />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-600">手机号</span>
            <Input value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-600">注册时间</span>
            <Input value={draft.registeredAt} onChange={(event) => setDraft((current) => ({ ...current, registeredAt: event.target.value }))} />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-600">头像文字</span>
            <Input value={draft.avatarText} onChange={(event) => setDraft((current) => ({ ...current, avatarText: event.target.value.slice(0, 2) }))} />
          </label>
          <div className="flex items-end">
            <Button type="submit" variant="primary">
              <Save className="size-4" />
              保存个人信息
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
        <div className="flex items-center gap-2">
          <UserRound className="size-5 text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-950">修改密码</h2>
        </div>
        <form className="mt-6 space-y-4" onSubmit={handlePasswordSubmit}>
          <Input type="password" placeholder="当前密码" value={password.current} onChange={(event) => setPassword((current) => ({ ...current, current: event.target.value }))} />
          <Input type="password" placeholder="新密码" value={password.next} onChange={(event) => setPassword((current) => ({ ...current, next: event.target.value }))} />
          <Input type="password" placeholder="确认密码" value={password.confirm} onChange={(event) => setPassword((current) => ({ ...current, confirm: event.target.value }))} />
          <Button type="submit" variant="secondary">
            保存密码
          </Button>
        </form>
        {message ? <div className="mt-4 rounded-md bg-blue-50 px-3 py-2 text-sm text-[#1155ff]">{message}</div> : null}
      </section>
    </div>
  );
}
