import { LegalScreen } from '@/components/legal-screen';

export default function Terms() {
  return <LegalScreen title="Terms of Service" updated="July 14, 2026" sections={[
    { title: 'Using Shiftora', body: 'You must provide accurate account information, keep credentials secure, and use the service only for lawful restaurant operations. Workspace owners are responsible for inviting authorized users and assigning appropriate roles.' },
    { title: 'Workplace responsibilities', body: 'Shiftora provides operational tools and is not the employer of workspace users. Restaurants remain responsible for labor-law compliance, payroll decisions, employee notices, location and photo consent, taxes, and recordkeeping.' },
    { title: 'Subscriptions and payments', body: 'Paid features, pricing, trial terms, renewal, and cancellation are shown before checkout. Subscription payments are processed by Stripe. Point-of-sale records do not replace required accounting or fiscal systems.' },
    { title: 'Acceptable use', body: 'Do not bypass access controls, interfere with the service, upload harmful content, probe other workspaces, misuse personal data, or use Shiftora for fraudulent attendance or payment activity.' },
    { title: 'Availability and changes', body: 'We work to keep Shiftora reliable but cannot guarantee uninterrupted availability. Features may change to improve security, compliance, or usability. Material changes will be communicated through appropriate product channels.' },
    { title: 'Account termination', body: 'Access may be suspended for security risks, unlawful use, nonpayment, or material breach. Workspace owners may remove team members. Applicable data obligations continue after access ends.' },
  ]} />;
}
