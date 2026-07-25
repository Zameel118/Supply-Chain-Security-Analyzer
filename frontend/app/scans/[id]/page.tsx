import { AppShell } from "@/components/AppShell";
import { ScanStatusPoller } from "@/components/ScanStatusPoller";

export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell>
      <ScanStatusPoller scanId={id} />
    </AppShell>
  );
}
