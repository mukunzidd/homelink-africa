"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { payRent, requestRepair, cancelViewing } from "@/app/actions/renting";
import { useToast } from "@/components/notifications/toaster";
import { Dialog } from "@/components/ui/dialog";
import { FileDrop } from "@/components/ui/file-drop";
import { ChoiceCards, Field, TextArea, TextInput } from "@/components/booking/fields";

/** Pays the due month by Mobile Money in one tap; the preview approves it. */
export function PayRentButton({ reference, label }: { reference: string; label: string }) {
  const t = useTranslations("account.renting");
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await payRent(reference, "mobileMoney");
        setBusy(false);
        toast.show({ title: t("paid"), tone: "ok" });
        router.refresh();
      }}
      className="min-h-10 cursor-pointer rounded-ctl bg-brand px-4 text-[14px] font-semibold text-on-brand hover:bg-brand-deep disabled:opacity-60"
    >
      {label}
    </button>
  );
}

export function RepairRequest({ reference }: { reference: string }) {
  const t = useTranslations("account.renting");
  const tf = useTranslations("files");
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "urgent">("normal");
  const [photo, setPhoto] = useState<string>();
  const [tried, setTried] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 cursor-pointer self-start rounded-ctl border border-line bg-surface px-4 text-[15px] font-semibold text-ink hover:border-brand hover:text-brand">
        {t("newRepair")}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("newRepair")}
        footer={
          <button
            type="button"
            onClick={async () => {
              setTried(true);
              if (title.trim().length < 3) return;
              const r = await requestRepair({ reference, title, description: detail, priority, photoName: photo });
              if (r.ok) {
                setOpen(false);
                toast.show({ title: t("sent"), tone: "ok" });
                router.refresh();
              }
            }}
            className="min-h-11 cursor-pointer rounded-ctl bg-brand px-4 text-[15px] font-semibold text-on-brand"
          >
            {t("send")}
          </button>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label={t("repairTitle")} error={tried && title.trim().length < 3 && t("repairTitle")} id="rp-title">
            {(a) => <TextInput {...a} invalid={a["aria-invalid"]} value={title} onChange={(e) => setTitle(e.target.value)} />}
          </Field>
          <Field label={t("repairDetail")} id="rp-detail">
            {(a) => <TextArea {...a} value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={1000} />}
          </Field>
          <div className="flex flex-col gap-1.5">
            <p className="text-[13px] font-semibold text-ink-2">{t("priority")}</p>
            <ChoiceCards name={t("priority")} value={priority} onChange={setPriority} columns={3} options={(["urgent", "normal", "low"] as const).map((p) => ({ value: p, title: t(`priorities.${p}`) }))} />
          </div>
          <FileDrop label="Photo" accept="image/*" capture="environment" value={photo} onFile={(f) => setPhoto(f?.name)} errors={{ type: tf("type"), size: tf("size"), choose: tf("choose"), drop: tf("drop"), remove: tf("remove") }} />
        </div>
      </Dialog>
    </>
  );
}

export function CancelViewingButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await cancelViewing(id);
        router.refresh();
      }}
      className="cursor-pointer rounded-ctl text-[14px] font-semibold text-crit hover:underline"
    >
      {label}
    </button>
  );
}
