import { LegalScreen } from '@/components/legal-screen';

export default function Privacy() {
  return <LegalScreen title="Privacy Policy" updated="July 14, 2026" sections={[
    { title: 'Information we process', body: 'Shiftora processes account details, restaurant and employment records, schedules, attendance events, device and diagnostic data, and payment status. When enabled by your workplace, check-in may include location and a photo.' },
    { title: 'Why we use it', body: 'We use this information to provide scheduling, attendance, point-of-sale, analytics, security, support, and service reliability. We do not sell personal information.' },
    { title: 'Sharing and processors', body: 'Information may be handled by service providers used for hosting, storage, email, error monitoring, push notifications, and AI features. Shiftora does not take card payments and does not collect or store payment card details.' },
    { title: 'Retention and security', body: 'Workspace records are retained while the restaurant account is active and as required for legitimate business, security, and legal purposes. We use access controls, encryption in transit, signed sessions, and audit-oriented monitoring.' },
    { title: 'Your choices', body: 'You can update profile information in the app. For access, correction, deletion, or export requests, contact your restaurant workspace owner. The owner can coordinate requests that require Shiftora support.' },
    { title: 'Location and photos', body: 'Location and photo permissions are requested only when you initiate a check-in method that uses them. You can deny device permission, although a restaurant may require location for attendance verification.' },
  ]} />;
}
