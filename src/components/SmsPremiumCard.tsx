import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, MessageSquareText, Smartphone } from "lucide-react";

import {
  SMS_PLAN_OPTIONS,
  checkSmsPayment,
  getSmsStatus,
  requestPhoneCode,
  startSmsPayment,
  verifyPhoneCode,
} from "@/lib/sms.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SmsPremiumCard() {
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getSmsStatus);
  const pay = useServerFn(startSmsPayment);
  const check = useServerFn(checkSmsPayment);
  const requestCode = useServerFn(requestPhoneCode);
  const verify = useServerFn(verifyPhoneCode);
  const { data: status } = useQuery({ queryKey: ["sms-status"], queryFn: () => fetchStatus() });

  const [plan, setPlan] = useState<string>("two_weeks");
  const [payPhone, setPayPhone] = useState("");
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => {
    if (!checkoutId) return;
    let tries = 0;
    const timer = setInterval(async () => {
      tries++;
      try {
        const res = await check({ data: { checkoutId } });
        if (res.status === "completed") {
          toast.success("Payment received — SMS Premium is active!");
          setCheckoutId(null);
          qc.invalidateQueries({ queryKey: ["sms-status"] });
        } else if (res.status !== "pending") {
          toast.error(`Payment ${res.status}. Please try again.`);
          setCheckoutId(null);
        }
      } catch {}
      if (tries > 30) {
        setCheckoutId(null);
        toast.error("Payment not confirmed yet. If you paid, refresh in a minute.");
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [checkoutId]);

  const startPay = useMutation({
    mutationFn: () => pay({ data: { plan, phone: payPhone } }),
    onSuccess: (r) => {
      setCheckoutId(r.checkoutId);
      toast.success("Check your phone and enter your M-Pesa PIN");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const sendCode = useMutation({
    mutationFn: () => requestCode({ data: { phone } }),
    onSuccess: () => {
      setCodeSent(true);
      toast.success("Verification code sent by SMS");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const confirm = useMutation({
    mutationFn: () => verify({ data: { code } }),
    onSuccess: () => {
      toast.success("Phone verified — you'll now get SMS updates");
      setCodeSent(false);
      setCode("");
      qc.invalidateQueries({ queryKey: ["sms-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const until = status?.premiumUntil ? new Date(status.premiumUntil).toLocaleDateString() : null;

  return (
    <section className="surface-card mt-6 p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
          <MessageSquareText className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold">SMS Updates Premium</h2>
          <p className="text-xs text-muted-foreground">
            {status?.isPremium
              ? `Active until ${until}`
              : status?.premiumUntil
                ? `Expired on ${until} — renew to keep getting SMS`
                : "Get announcements, new documents and tomorrow's classes by SMS"}
          </p>
        </div>
      </div>

      {!status?.isPremium ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {SMS_PLAN_OPTIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlan(p.id)}
                className={`rounded-xl border p-3 text-center transition ${plan === p.id ? "border-primary bg-primary/10" : "border-border bg-card"}`}
              >
                <span className="block font-display text-lg font-bold text-primary">KES {p.amount}</span>
                <span className="block text-xs text-muted-foreground">{p.label}</span>
              </button>
            ))}
          </div>
          <Input
            inputMode="tel"
            placeholder="M-Pesa number e.g. 0712345678"
            value={payPhone}
            onChange={(e) => setPayPhone(e.target.value)}
          />
          <Button
            className="w-full rounded-xl"
            disabled={startPay.isPending || !!checkoutId || !payPhone.trim()}
            onClick={() => startPay.mutate()}
          >
            {checkoutId ? "Waiting for M-Pesa confirmation…" : "Pay with M-Pesa"}
          </Button>
        </div>
      ) : status.phoneVerified ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5 text-sm">
          <CheckCircle2 className="size-4 text-primary" />
          SMS updates go to <b>+{status.phone}</b>
          <button type="button" className="ml-auto text-xs text-primary underline" onClick={() => setCodeSent(false)}>
            {""}
          </button>
        </div>
      ) : null}

      {status?.isPremium ? (
        <div className="mt-4 space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Smartphone className="size-4 text-primary" />
            {status.phoneVerified ? "Change phone number" : "Add your phone number"}
          </p>
          {!codeSent ? (
            <div className="flex gap-2">
              <Input inputMode="tel" placeholder="0712345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Button className="rounded-xl" disabled={sendCode.isPending || !phone.trim()} onClick={() => sendCode.mutate()}>
                Send code
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input inputMode="numeric" maxLength={6} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
              <Button className="rounded-xl" disabled={confirm.isPending || code.length < 6} onClick={() => confirm.mutate()}>
                Verify
              </Button>
            </div>
          )}
          {status.isPremium && !status.phoneVerified ? null : null}
          <p className="text-[11px] text-muted-foreground">
            Renew anytime — extra time is added to your current plan.
          </p>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {SMS_PLAN_OPTIONS.map((p) => (
              <button key={p.id} type="button" onClick={() => setPlan(p.id)}
                className={`rounded-xl border p-2 text-center text-xs ${plan === p.id ? "border-primary bg-primary/10" : "border-border"}`}>
                KES {p.amount} · {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input inputMode="tel" placeholder="M-Pesa number" value={payPhone} onChange={(e) => setPayPhone(e.target.value)} />
            <Button variant="outline" className="rounded-xl" disabled={startPay.isPending || !!checkoutId || !payPhone.trim()} onClick={() => startPay.mutate()}>
              {checkoutId ? "Waiting…" : "Renew"}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
