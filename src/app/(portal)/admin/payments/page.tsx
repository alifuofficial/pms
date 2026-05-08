import { PaymentsView } from "@/components/shared/payments-view";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  return <PaymentsView title="System Payments" searchParams={params} />;
}
