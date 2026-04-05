import { redirectIfAuthenticated } from '@/lib/session';
import { getAuthMethodAvailability } from '@/lib/auth-provider-config';
import { RegisterForm } from './register-form';

export default async function RegisterPage() {
  await redirectIfAuthenticated();
  return <RegisterForm availability={getAuthMethodAvailability()} />;
}
