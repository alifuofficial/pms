import { UnitsView } from "@/components/shared/units-view";

export default async function ManagerUnitsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  return <UnitsView title="Manager Units" searchParams={params} />;
}
