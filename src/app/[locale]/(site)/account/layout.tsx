import { AccountFrame } from "@/components/account/account-frame";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountFrame>{children}</AccountFrame>;
}
