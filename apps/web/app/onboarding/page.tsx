import { AppShell } from '../../components/app-shell';
import { OnboardingFlow } from '../../components/onboarding-flow';

export default function OnboardingPage() {
  return (
    <AppShell eyebrow="Kurulum" title="Onboarding akışı">
      <OnboardingFlow />
    </AppShell>
  );
}
