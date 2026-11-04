import DashboardLayout from '../../components/feature/DashboardLayout';
import ServiceFinancesDashboard from '../dashboard/components/ServiceFinancesDashboard';

/** Budget et demandes de dépense : espace du service des finances, et des admins qui tranchent les demandes. */
export default function ServiceFinancesPage() {
  return (
    <DashboardLayout>
      <ServiceFinancesDashboard />
    </DashboardLayout>
  );
}
