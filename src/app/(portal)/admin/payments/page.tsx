import { PaymentsView } from "@/components/shared/payments-view";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return <PaymentsView title="System Payments" searchParams={searchParams} />;
}
