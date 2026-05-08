import { UnitsView } from "@/components/shared/units-view";

export default async function AdminUnitsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  return <UnitsView title="Admin Units" searchParams={params} />;
}
