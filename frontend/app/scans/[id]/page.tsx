import { ScanStatusPoller } from "@/components/ScanStatusPoller";

export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <ScanStatusPoller scanId={id} />
    </main>
  );
}
