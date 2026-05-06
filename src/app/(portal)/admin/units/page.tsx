import { UnitsView } from "@/components/shared/units-view";

export default async function AdminUnitsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return <UnitsView title="Admin Units" searchParams={searchParams} />;
}
